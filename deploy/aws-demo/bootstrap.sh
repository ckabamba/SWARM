#!/usr/bin/env bash
# Install or update WarmPath on one Amazon Linux 2023 host. Run as root.
#
# Expects, uploaded beforehand by the operator:
#   /tmp/warmpath-src.tar.gz    git archive of backend/, prototypes/ and deploy/
#   /tmp/warmpath-dist.tar.gz   frontend/dist built with VITE_DATA_SOURCE=api
#   /etc/warmpath/warmpath.env  see warmpath.env.example (0640 root:warmpath)
#   /etc/warmpath/origin-secret the CloudFront X-Origin-Verify value (0600 root)
#
# It never prints either secret, runs no migration and loads no catalog data.
set -euo pipefail

APP=/opt/warmpath
PYTHON=${WARMPATH_PYTHON:-python3.12}

dnf install -y -q nginx "$PYTHON" tar gzip

id warmpath >/dev/null 2>&1 || useradd --system --home-dir "$APP" --shell /sbin/nologin warmpath
install -d -o root -g root -m 0755 "$APP"
install -d -o root -g warmpath -m 0750 /etc/warmpath

for required in /tmp/warmpath-src.tar.gz /tmp/warmpath-dist.tar.gz /etc/warmpath/warmpath.env /etc/warmpath/origin-secret; do
    [ -s "$required" ] || { echo "Missing $required" >&2; exit 1; }
done
chown root:warmpath /etc/warmpath/warmpath.env && chmod 0640 /etc/warmpath/warmpath.env
chown root:root /etc/warmpath/origin-secret && chmod 0600 /etc/warmpath/origin-secret

# 1 GiB of swap: two concurrent password hashes plus two document workers can
# briefly exceed a small instance's memory.
if [ ! -f /swapfile ]; then
    dd if=/dev/zero of=/swapfile bs=1M count=1024 status=none
    chmod 0600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Replace the release atomically enough for a demo: unpack beside, then swap.
rm -rf "$APP/app.new"
install -d -m 0755 "$APP/app.new/frontend"
tar -xzf /tmp/warmpath-src.tar.gz -C "$APP/app.new"
tar -xzf /tmp/warmpath-dist.tar.gz -C "$APP/app.new/frontend"
[ -f "$APP/app.new/frontend/dist/index.html" ] || { echo 'frontend/dist/index.html is missing from the upload' >&2; exit 1; }
chown -R root:root "$APP/app.new"
chmod -R a+rX,go-w "$APP/app.new"

[ -x "$APP/venv/bin/python" ] || "$PYTHON" -m venv "$APP/venv"
"$APP/venv/bin/pip" install --quiet --no-cache-dir --upgrade pip
"$APP/venv/bin/pip" install --quiet --no-cache-dir -r "$APP/app.new/backend/requirements.txt"

rm -rf "$APP/app.old"
[ -d "$APP/app" ] && mv "$APP/app" "$APP/app.old"
mv "$APP/app.new" "$APP/app"

# The RDS certificate bundle is public; sslmode=verify-full needs it on disk.
curl -fsS --retry 3 https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem -o /etc/warmpath/rds-ca.pem
chmod 0644 /etc/warmpath/rds-ca.pem

install -m 0644 "$APP/app/deploy/aws-demo/warmpath.service" /etc/systemd/system/warmpath.service

# Substitute the origin secret without placing it on a command line.
umask 077
python3 - "$APP/app/deploy/aws-demo/nginx-warmpath.conf" /etc/nginx/conf.d/warmpath.conf <<'PY'
import re, sys
secret = open('/etc/warmpath/origin-secret').read().strip()
if not re.fullmatch(r'[A-Za-z0-9_-]{32,}', secret):
    sys.exit('origin-secret must be at least 32 URL-safe characters')
open(sys.argv[2], 'w').write(open(sys.argv[1]).read().replace('__ORIGIN_SECRET__', secret))
PY
umask 022
nginx -t

systemctl daemon-reload
systemctl enable --now nginx
systemctl reload nginx
systemctl enable warmpath
systemctl restart warmpath

# Report readiness through nginx exactly as CloudFront will reach it.
origin_host=$(sed -n 's#^WARMPATH_PUBLIC_ORIGIN=https://##p' /etc/warmpath/warmpath.env)
for attempt in $(seq 1 20); do
    code=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $origin_host" \
        -H @<(printf 'X-Origin-Verify: %s' "$(cat /etc/warmpath/origin-secret)") http://127.0.0.1/api/ready || true)
    [ "$code" = 200 ] && break
    sleep 2
done
echo "api/ready through nginx: $code"
echo "without the origin header: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/api/ready)"
[ "$code" = 200 ] || { systemctl --no-pager --lines 30 status warmpath || true; exit 1; }
