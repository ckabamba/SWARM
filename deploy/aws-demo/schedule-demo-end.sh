#!/usr/bin/env bash
# Power the host off at a fixed UTC time. Run as root.
#
#   schedule-demo-end.sh "2026-11-16 12:00:00"
#
# The instance must have been launched with
# --instance-initiated-shutdown-behavior terminate, so powering off terminates it
# and deletes its root volume. That ends the hourly instance, disk and public
# IPv4 charges without needing the operator's computer or any IAM role on the host.
# The timer is persistent: if the host is down at that time, it fires on next boot.
set -euo pipefail

when=${1:?UTC time, for example "2026-11-16 12:00:00"}
date -u -d "$when" >/dev/null   # reject an unparseable time

cat > /etc/systemd/system/warmpath-demo-end.service <<'UNIT'
[Unit]
Description=End of the WarmPath demo window: power off (terminates the instance)

[Service]
Type=oneshot
ExecStart=/usr/bin/systemctl poweroff
UNIT

cat > /etc/systemd/system/warmpath-demo-end.timer <<UNIT
[Unit]
Description=WarmPath demo end at $when UTC

[Timer]
OnCalendar=$when UTC
Persistent=true

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now warmpath-demo-end.timer
systemctl list-timers warmpath-demo-end.timer --no-pager
