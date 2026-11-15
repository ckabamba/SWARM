# WarmPath on AWS for a short demo

One small EC2 host serves Thermal, the React client and `/api` from the same FastAPI process, behind CloudFront for HTTPS, using the existing RDS database. It is sized and secured for a demo of about a day, not for production.

```
browser --HTTPS--> CloudFront (*.cloudfront.net, no caching)
                      | HTTP :80, secret X-Origin-Verify header, CloudFront addresses only
                      v
                 EC2: nginx --> 127.0.0.1:8000 FastAPI (python -m backend.manage run)
                      | TLS, sslmode=verify-full, restricted role warmpath_app
                      v
                 RDS PostgreSQL (warmpath-db)
```

- `/` redirects to `/thermal/`, the main UI. The React client (alumni paths, history, courses, asks) is at `/app/`.
- `/demo/` is optional: the same React client built on fixtures, with 1,000 invented alumni bundled in the page and labelled as synthetic. It reads nothing from the API or the database. See [docs/demo-alumni.md](../../docs/demo-alumni.md).
- Every AWS resource created for the demo carries the tag `Project=warmpath-demo`.

## Limits to know about

- **CloudFront to the host is plain HTTP.** Browsers always use HTTPS, but the hop from CloudFront to the instance is unencrypted. The security group admits only CloudFront's origin-facing addresses and nginx rejects requests without the secret header. Encrypting that hop needs a certificate for a domain name.
- **No edge caching.** The distribution uses `Managed-CachingDisabled`, so no API response, private or public, is ever cached. Static files are served from the host on every request.
- **Events are refreshed by the operator**, not by the host. `/api/events` reports `stale: true` 24 hours after the last refresh. See [Refresh events](#refresh-events).
- **The host holds only the restricted database login.** `warmpath_app` can read all tables and write only the account, profile, course, draft, post, history, ask, workspace and rate-limit tables. It cannot change schema, catalog or event data.
- Accounts still have no email or GT verification and no password recovery.

## What it costs

On-demand prices in us-east-1, checked on 2026-11-15. Check them again before reusing this.

| Resource | Rate | 24 hours |
| --- | --- | --- |
| EC2 `t3.small`, standard CPU credits | $0.0208 per hour | $0.50 |
| Public IPv4 address | $0.005 per hour | $0.12 |
| 8 GB gp3 root volume | $0.08 per GB-month | $0.02 |
| CloudFront, pay-as-you-go | free allowance covers demo traffic | $0.00 |

The security group, key pair and an idle CloudFront distribution cost nothing. The RDS instance is a separate, existing cost and keeps charging whether or not the demo runs.

## Deploy

Run from the repository root in PowerShell with an AWS CLI profile that may manage EC2 and CloudFront. `.local/` is ignored by git; keep the SSH key and anything secret there.

1. **Database first.** Back up, then apply migrations and load the catalog as the operator, following [docs/database-rollout.md](../../docs/database-rollout.md). Create the runtime role with a generated password and the grants listed there. The API refuses to start on an unmigrated database.
2. **Network.** Create a security group in the database's VPC that allows TCP 80 from the managed prefix list `com.amazonaws.global.cloudfront.origin-facing` and TCP 22 from your own address only.
3. **Host.** Launch Amazon Linux 2023 `t3.small` in a public subnet with:

   ```
   --credit-specification CpuCredits=standard
   --instance-initiated-shutdown-behavior terminate
   --metadata-options HttpTokens=required,HttpEndpoint=enabled
   ```

   `standard` credits prevent surprise burst charges. `terminate` lets the host end its own charges; see step 8.
4. **CloudFront.** Create a distribution whose only origin is the instance's public DNS name, HTTP only on port 80, with a custom origin header `X-Origin-Verify` set to a random value of 32 or more URL-safe characters. Default behaviour: redirect HTTP to HTTPS, all methods allowed, cache policy `Managed-CachingDisabled`, origin request policy `Managed-AllViewer` (forwards Host, Origin, cookies and query strings).
5. **Build and package.** `core.autocrlf=false` matters on Windows: the host needs Unix line endings.

   ```powershell
   cd frontend
   $env:VITE_DATA_SOURCE = 'api'; npm.cmd run build
   $env:VITE_DATA_SOURCE = 'fixture'; npm.cmd run build -- --outDir dist-demo   # optional /demo/ page
   cd ..
   git -c core.autocrlf=false archive --format=tar.gz -o .local\release\warmpath-src.tar.gz HEAD backend prototypes deploy
   tar -czf .local\release\warmpath-dist.tar.gz -C frontend dist dist-demo
   ```

   Leave `dist-demo` out of both commands to host without the synthetic demo page. Build `dist` in `api` mode only: a fixture-mode `dist` would show invented data at `/app/`.

6. **Settings on the host.** Write `/etc/warmpath/warmpath.env` from [warmpath.env.example](warmpath.env.example), with `WARMPATH_PUBLIC_ORIGIN` set to `https://<id>.cloudfront.net`, and `/etc/warmpath/origin-secret` containing the header value. Send them over SSH standard input so they never appear in a command line, shell history or this repository.
7. **Install.** Copy both archives and `bootstrap.sh` to `/tmp` on the host, then:

   ```sh
   sudo bash /tmp/bootstrap.sh
   ```

   It installs nginx and Python, unpacks the release, starts `warmpath.service` and prints the `/api/ready` status through nginx with and without the origin header (expect `200` and `403`). Re-run it to deploy a new release.
8. **Schedule the end.** On the host, with the UTC time the demo ends:

   ```sh
   sudo bash /opt/warmpath/app/deploy/aws-demo/schedule-demo-end.sh "2026-11-16 12:00:00"
   ```

9. **Verify at the public URL**, not on the host: pages load, `/api/ready` is ready, a new account can sign in from a second browser, profile and course edits persist, a public profile can post, and `/api/events` is not stale.

## Refresh events

Run the event import as the operator role from a machine that can reach RDS, never with the runtime role:

```sh
python -m backend.api.sync_events
```

## Clean up

Powering off the host (step 8, or `sudo systemctl poweroff`) terminates it and deletes its disk, which ends every hourly charge this deployment adds. Remove the rest afterwards; none of it costs anything while idle.

```powershell
# 1. The instance, if it has not already terminated itself.
aws ec2 describe-instances --filters Name=tag:Project,Values=warmpath-demo --query "Reservations[].Instances[].[InstanceId,State.Name]" --output text
aws ec2 terminate-instances --instance-ids <instance-id>
aws ec2 wait instance-terminated --instance-ids <instance-id>

# 2. CloudFront: disable, wait until deployed, then delete.
aws cloudfront get-distribution-config --id <distribution-id> --query DistributionConfig --output json > .local\cf.json
#    Edit .local\cf.json: set "Enabled" to false. It contains the origin secret; delete the file afterwards.
aws cloudfront update-distribution --id <distribution-id> --distribution-config file://.local/cf.json --if-match <ETag from get-distribution-config>
aws cloudfront wait distribution-deployed --id <distribution-id>
aws cloudfront delete-distribution --id <distribution-id> --if-match <ETag from get-distribution>

# 3. Security group and key pair, after the instance is terminated.
aws ec2 delete-security-group --group-id <security-group-id>
aws ec2 delete-key-pair --key-name warmpath-demo
```

Then delete the local SSH key and encrypted secrets under `.local/`.

**Keep:** the RDS instance, its data and its backups. If the site will not be hosted again soon, the database owner can drop the runtime login with `DROP OWNED BY warmpath_app; DROP ROLE warmpath_app;`. Accounts and posts created during the demo stay in the database until someone removes them.
