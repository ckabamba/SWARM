# Database rollout: resources first, reviewed histories afterward

The intended existing target, supplied by Christofort, is **AWS region `us-east-1`, RDS instance `warmpath-db`, database `warmpath`**. Ezekiel Currie administers the database in the user's AWS account. These identifiers are not proof of current connectivity, schema version or access. No infrastructure was provisioned. On November 15, 2026, authenticated read-only inspection found PostgreSQL 18.3 and revision 0008, but no activity_contribution or ask tables. The revision label therefore does not match the local migration chain; reconcile it before running migrations or deploying the new history/ask API. Separately, the authorized init-catalog load populated 32 public resources and two job examples; the 68 existing events and empty person/account tables were verified unchanged.

The first shared environment starts with public campus resources, course/VIP descriptions, curated job examples and fresh public events. Do not transfer local accounts, password hashes, personal profiles, courses, posts, import drafts, browser workspaces or sessions. Do not run the path fixture loader against RDS. New users create their accounts and contribute reviewed histories through the application.

## 1. Inspect and agree on the destination

With Ezekiel, verify the instance is the intended one, its engine version, current database names, migration revision, existing data, backup policy and cost ownership. A read-only AWS CLI inventory is:

```powershell
aws rds describe-db-instances --region us-east-1 --db-instance-identifier warmpath-db --query 'DBInstances[0].{Identifier:DBInstanceIdentifier,Status:DBInstanceStatus,Engine:Engine,Version:EngineVersion,Database:DBName,Class:DBInstanceClass,StorageGB:AllocatedStorage,Encrypted:StorageEncrypted,Public:PubliclyAccessible,MultiAZ:MultiAZ,BackupDays:BackupRetentionPeriod}'
```

Use read-only SQL for migration revision and table counts after a private connection is available. Do not print credentials or personal records. Earlier PR notes reported RDS at `0001`; verify rather than assuming it is still there. The original local database ran PostgreSQL 17.12; rehearse on the actual RDS major version before release.

If `warmpath` already contains team work, obtain an agreed environment/database destination on the same instance. Do not wipe it to meet the fresh-start requirement. A separate logical database may be appropriate and avoids buying a second instance, but still consumes storage and needs an administrator to create it. Preserve the original local database unchanged.

## 2. Prepare access and roles

- Keep PostgreSQL private. Permit the application host's security group to reach the RDS database port. Administration from a laptop uses the team's approved private network or managed tunnel; do not expose the database broadly to remove a connection step.
- Use the real RDS endpoint with TLS hostname verification (`sslmode=verify-full`) and the AWS RDS CA bundle. Configure tunnel hostname resolution carefully so verification still uses that endpoint.
- Store the application's `DATABASE_URL` in protected server configuration or an approved secret store. It is never a `VITE_` variable and must not appear in Git, screenshots, command history or logs.
- Use a migration/operator role for schema changes, catalog loading and event ingestion. Use a separate runtime role for API workers. Neither should copy the local administrative role/password.

After migrations, grant the runtime role schema usage, reads on the application tables and sequence usage needed for inserts. Grant insert/update/delete only on its mutable application tables: `person`, `account`, `account_session`, `person_profile`, `person_course`, `resume_draft`, `transcript_draft`, `account_rate_limit`, `post`, `activity`, `person_activity`, `activity_contribution`, `ask`, `api_workspaces` and `api_saved_resources`. Resource/job/event/feed and location tables are read-only to the API role. The runtime role should not own schema objects or have CREATE/ALTER/DROP permissions. Do not grant writes to `alembic_version`.

Ezekiel must adapt grants to the actual schema and owner roles. PostgreSQL sequence grants are separate from table grants. Future migrations must extend privileges deliberately; avoid giving runtime automatic write access to every future table. Test a startup plus account/history/Ask workflow using the runtime role, not the migration account.

## 3. Rehearse locally

Use a disposable database, never the shared RDS database or the developer's personal data. Install the pinned requirements and configure `DATABASE_URL` for this disposable database. In the repository root, using its virtual-environment Python:

```sh
python -m backend.manage migrate
python -m backend.manage init-catalog
python -m backend.api.sync_events
python -m backend.manage run
```

The commands have distinct responsibilities:

| Command | Responsibility |
| --- | --- |
| `migrate` | Apply the reviewed migration chain. `0006` adopts existing `api_*` tables without dropping their rows; `0007` adds reviewed history provenance and projections; `0008` adds participant-owned Asks. |
| `init-catalog` | Idempotently upsert the checked-in 32 campus/course/VIP resources and two public job examples. It does not create tables, people, participation or outcomes, and does not delete unrelated catalog rows. |
| `sync_events` | Import public GT source metadata, preserving the previous successful snapshot when a source fails. No personal data is imported. |
| `run` | Start the API after read-only schema/catalog checks. It never creates schema or refreshes catalog values. |

Missing schema produces an error directing the operator to `migrate`; an uninitialized resource/job catalog directs them to `init-catalog`. Normal startup still expires sessions/drafts/workspaces; those are runtime cleanup writes, not schema or catalog changes. Changes to checked-in catalog JSON now require `init-catalog` explicitly rather than restarting the API.

Run automated tests against `warmpath_test` only. Database tests refuse any other database name; keep `TEST_DATABASE_URL` separate from the application target. The catalog bootstrap tests use throwaway schemas and verify migration prerequisites, idempotency, absence of imported personal data, and no schema/catalog mutation during API startup. Do not run the full API suite concurrently with browser tests sharing test accounts.

## 4. Apply the prepared release to RDS

Before changing an existing database, take and verify an administrator-approved backup/snapshot and record the release commit plus current migration revision. Verify available storage and the upgrade path. Schema adoption is additive; it is not permission to overwrite other owners' records.

Run the rehearsed `migrate`, `init-catalog` and `sync_events` commands against the agreed destination using the operator role. Configure the running API with the restricted runtime role afterward. Do not run `backend.manage init/start/stop` for RDS: those commands operate the optional Windows portable cluster. `run` skips that cluster when `DATABASE_URL` is configured.

Record approved resource/job counts, successful source snapshots and their timestamps. Confirm no accounts, people, courses, posts, drafts or sessions were copied. Existing public events may be stale if a source is unavailable; show that state rather than claiming a successful refresh.

## 5. Acceptance and rollback

Before sharing the environment, verify:

- `/api/ready` succeeds under the runtime role; resource search, job-topic matching and event listings use the shared database.
- A user can create an account and sign in from a second device. Accounts begin private, and private entries never contribute public path evidence.
- Reviewed history survives restart; changes to sharing remove public contributions. Resource-only initialization correctly has no alumni evidence yet.
- Posts and Asks persist; only the intended recipient can accept an Ask. No fixture profiles or records appear in real APIs.
- Backup restoration works in an isolated destination, and logs omit credentials and document contents.

Before accepting cloud writes, rollback can return the application to its previous database/configuration. Once new accounts or other records exist in RDS, do not simply switch to the stale local database: pause writes and preserve/reconcile cloud records first. For code rollback, prefer a compatible previous release; migration downgrades can drop data and require a separate reviewed recovery procedure. Keep the old local database until the owner approves its retirement.

## Operating budget and remaining deployment work

The AWS budget is **$100 total**, including services already running. Reuse the existing instance, verify current spend and available credits, and price added storage, backups, administration/network access and the application host before enabling them. Keep the planned $40 reserve. Stopping RDS still charges for retained storage/backups and automatically restarts after seven days; budget alerts are monitoring, not a hard spending cap. Track retained resources and schedule a reviewed cleanup or continued-funding decision.

Moving PostgreSQL does not host the website. The backend/UI still need an application server, HTTPS address, supervised startup and a controlled update process. The public-origin settings in [Running WarmPath](running-warmpath.md#one-shared-url-for-users) support that later step. Local accounts still lack email/GT verification, password recovery and production moderation.

AWS references: [RDS private networking](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html), [TLS verification](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html), and [RDS stop behavior](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_StopInstance.html).
