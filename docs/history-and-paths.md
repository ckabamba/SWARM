# Reviewed histories, paths and asks

The connected APIs use real account records. All participation is self-reported, not verified attendance. New profiles and imported entries remain private. Existing entries are not automatically treated as confirmed history.

## Run and try it

Run these from the repository root, using the virtual environment:

```powershell
.\.venv\Scripts\python.exe -m backend.manage migrate
.\.venv\Scripts\python.exe -m backend.manage init-catalog
cd frontend
npm install
$env:VITE_DATA_SOURCE='api'
npm run build
cd ..
.\.venv\Scripts\python.exe -m backend.manage run
```

Restart an already running API after building. Thermal stays at `/thermal/`; its Alumni paths & history link opens `/app/`. Direct routes are `/app/#/history`, `/app/#/courses`, and `/app/#/asks`. For Vite development set `VITE_DATA_SOURCE=api` in the ignored frontend environment file; explicit fixture mode remains a separate prototype. Do not use generated fixtures in the connected database.

Create/sign in to an account. Add an experience or import a resume through the account drawer. Manage classes and reviewed PDF/text transcript imports on My Courses. Imported transcript statuses may be unspecified; explicitly select taken/completed for coursework actually attended. Grades/GPA are excluded. Review participation, academic year and sharing on My history. Confirming history does not automatically publish it. An alumnus must both share the entry and make the profile public to contribute to public counts.

The first academic year starts in August. Explicit school year wins; otherwise an explicit enrollment year plus a precise Fall/Spring/Summer term or experience start month establishes chronology. Graduation year is never used to infer participation dates. Unknown chronology requires review. Same-year activities cannot establish which came first. Planned/in-progress/unspecified courses, transfer/exam credit, projects and volunteering do not contribute to the current engine.

## Data flow

Profile experiences and independent course records are the source of truth. In the same transaction as a source write, `activity_contribution` records its source entry, canonical activity, academic year and sharing choice. `person_activity` aggregates one row per person/activity. The earliest personal year powers the owner's personalization; a separate earliest shared year powers public queries. Removing one retake does not remove participation supported by another; editing/deleting the last source removes that projection. Revisions reject stale writes atomically.

Exact GT course codes match the catalog. Otherwise courses are keyed by institution/code, and supported experiences by type/organization/title. Explicit selections must refer to a sourced, owned or shared activity of the same type. Matching names never verifies a claim. Fixture rows remain excluded from connected queries.

Public lift uses public alumni with at least one eligible shared history as its population, and compares the fraction of goal achievers who did an activity earlier with the fraction of this population who did it at any time. Stops require at least three achievers and lift >= 1.5, with at most five stops. Counts are associations, not causes. Hiding an entry/profile immediately changes query eligibility. The display's current student year remains an estimate from graduation year; it is separate from evidence chronology.

## HTTP contract (all paths prefixed `/api`)

| Endpoint | Contract |
| --- | --- |
| `GET /me/history` | Owner-only `{items,profile_version,courses_version,profile_visible,evidence}`. Items include source_kind/source_id, activity_id, school_year, confirmation, sharing, status and reason. |
| `PUT /me/history/{course\|experience}/{id}` | `{version,activity_id?,school_year?,history_confirmed,visible}`. Use the source collection's revision. Unresolved matching stays needs_review, with no contribution. |
| `GET /activities?q=` | Authenticated matching choices; excludes other people's private-only definitions. |
| `GET /goals?q=` | Public shared alumni activities `{items:[{id,label,type,achievers}],evidence,fixture_evidence:false}`. |
| `POST /path` | Existing `{goal,job_id?}` resource search remains unchanged. `{mode:"alumni",goal_id}` requires login and returns goal/student/stops/events/reason plus evidence and population. No client identity accepted. Alternatively `{mode:"alumni",goal:"..."}` resolves text only against public shared alumni goals and returns `{match,path}`; ambiguous/no-match results have `path:null` and candidates under `match`. Supply exactly one of `goal` and `goal_id`; selecting an ID preserves the direct path response. Missing embeddings use keyword matching with `fallback_reason`. |
| `GET /people?goal_id=&activity_id=` | Authenticated ranked alumni `{items,evidence,fixture_evidence:false}`. Optional activity filters earlier participation. Items include factual editable draft and can_ask. No goal retains the legacy empty response. |
| `POST /asks` | `{alum_id,goal_id,message,request_id}` with UUID request ID. Sender comes from login; recipient must be a public alumni account sharing this goal. Same ID/payload retries return the same ask; a different payload returns 409. |
| `GET /asks?box=all\|inbox\|outbox&before=&limit=` | Participant-only `{items,next_cursor}`. |
| `GET /asks/{id}` | Participant-only ask; anonymous 401, unrelated member 404. |
| `POST /asks/{id}/accept` | Recipient-only, idempotent sent-to-accepted transition. Sender receives 403. |

Ask records return `{id,sender:{id,name},recipient:{id,name},goal:{id,label},message,status,created_at,accepted_at,can_accept,reply_url}`. The exact edited message is preserved, limited to 2,000 characters. Reply links use `/app/#/reply/{id}`. Existing participants retain access if a profile later becomes private; new requests are blocked. Deleting an account cascades its asks. This is an in-app request/acceptance flow; email delivery, chat, scheduling and contact exchange are not implemented. Drafts are deterministic factual templates and incur no AI charges.

## Verification and rollout

Run `python -m pytest backend/tests -q` against the isolated `warmpath_test` database. Tests cover canonical matching, retakes/private timing, imports, revisions, counts/lift, privacy withdrawal, ownership, idempotency and accepted-state persistence after app restart. Never run these tests against RDS. Follow [database rollout](database-rollout.md) for the existing AWS target and resources/events-only initialization. Cloud access, runtime-role rehearsal and actual migration remain deployment steps.


### Legacy local embeddings migration

Event embeddings now use revision `0011`, after `0010_asks`. A database that applied the unpushed `0009_event_embedding` is **not** at main's `0009_history_sync`, despite its version marker. Do not run a blind upgrade or stamp it directly to head.

After backing up that local database, verify the old state: `event_embedding` exists, `activity_contribution` and `ask` do not, and `activity.canonical_key` and `person_activity.history_managed` are absent. For that exact state, use Alembic on one transaction/connection to stamp `0008`, upgrade through `0010`, verify the existing embedding table matches `0011_event_embedding.py`, then stamp `0011` to acknowledge the already-applied embedding schema. Preserve the embedding table and its rows. If any checks differ, inspect the actual schema before choosing a recovery path. Fresh databases and databases using main's real `0009` use the normal upgrade to head.

The branch reconciliation repaired only the isolated test database. The development database still needs this explicit recovery before starting the updated API.
