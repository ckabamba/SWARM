# Thermal: local PostgreSQL setup and testing

**New teammates:** start with the [cross-platform clone setup](running-warmpath.md). The portable Windows instructions below describe the original machine; its `.local/` database and `.venv/` are not included in Git. Root `.env` is now read by the launcher, and an explicit `DATABASE_URL` selects Docker or an existing PostgreSQL server instead of starting the portable cluster.

**Courses/transcripts:** run the migration again for `0003`, then open **My Courses**. See [course APIs, migration details and browser tests](courses-and-transcripts.md). Existing course entries are preserved, and grade/GPA columns are excluded from transcript review drafts.

**Profile/resume update:** [My Profile setup, API and tests](profiles-and-resumes.md) now cover local accounts, editable experiences/contacts/classes and reviewed imports. Run `.\.venv\Scripts\python.exe -m backend.manage migrate` once after installing the updated requirements and before starting this version. Existing resource tables/data are preserved. API startup does not apply shared migrations.

Thermal is now connected to a local FastAPI/PostgreSQL service. It searches a curated catalog of real Georgia Tech resources, opens source links, saves resources and the last search to a private browser workspace, and displays imported public events. Social Jackets shares its accounts, public profiles, resources/events and persistent PostgreSQL posts. React/Vite and Expo remain separate prototypes; Transit and Engineering Pad were removed upstream.

There is no real alumni-history dataset yet. The UI therefore does not display invented alumni, lift scores, outcome counts, or sendable asks. CareerBuzz is a source-linked resource requiring GT login for job listings, not a local copy of those jobs. Production identity, geographic maps, voice, and model-backed discovery remain future slices. Local accounts, profiles/resumes, courses/transcripts and community posting are implemented. See [community setup and testing](community.md).

## Run on this computer

PostgreSQL 17.12 binaries and databases have been set up under the ignored `.local/` directory, with packages in `.venv/`. In PowerShell:

```powershell
Set-Location 'C:\Users\akabamba\Documents\SWARM\SWARM'
.\.venv\Scripts\python.exe -m backend.manage run
```

Open **http://127.0.0.1:8000/thermal/**. API documentation is at **http://127.0.0.1:8000/docs**. This one server serves Thermal and `/api` on the same origin. Do not use the old port-4712 static-only command for connected Thermal. Social Jackets also requires this server; a static server cannot provide its API.

Ctrl+C stops the API. PostgreSQL remains running locally on port 55432. To stop it when finished:

```powershell
.\.venv\Scripts\python.exe -m backend.manage stop
```

The UI still needs internet access for CDN libraries. The database/API are local and make no paid model calls or AWS requests. Starting the API does not refresh external events automatically.

## Refresh public data

```powershell
.\.venv\Scripts\python.exe -m backend.api.sync_events
```

The refresh imports metadata from the public [GT Engage event search](https://gatech.campuslabs.com/engage/events) and the [Georgia Tech calendar RSS feed](https://calendar.gatech.edu/event-calendar-week.xml). The verified run imported 58 approved public Engage records (after excluding sandbox organizations) and 10 calendar records. This is a bounded snapshot of up to 60 requested Engage records, not an exhaustive campus database. The UI shows up to 12 unexpired listings across the latest successful source snapshots, prioritizing upcoming start dates over already-started date ranges.

Only public/approved Engage records are accepted. No attendee records, resumes, private profiles, or authenticated CareerBuzz listings are collected. Event metadata includes title, source URL, start/end, retrieval time, and Engage location/organizer where supplied. Date ranges may describe recurring events rather than continuous sessions; the UI tells users to confirm the schedule at the source.

Imports update records by source URL. Failed or unparseable sources keep their last good snapshot. Listings removed from the next successful snapshot stop appearing. Old events are filtered by end time. The UI identifies stale/missing snapshots after 24 hours. There is no background refresh schedule yet. A browser's **Reload snapshot** button reloads stored data; run the command above to fetch newer data from the sources.

The catalog has 18 entries: seven campus resources in `backend/api/catalog.json`, plus eight courses and three specific VIP projects in `curriculum.json`, checked against official sources on November 14, 2026. Two public NVIDIA job examples in `job_examples.json` enable description-based topic matching. Descriptions are short paraphrases; tags/topic normalization are explicit relevance choices, not endorsements or verified alumni outcomes. Updates require reviewing and editing those files, then restarting the API. See [source and evidence details](data-evidence-and-linkedin.md).

## What to test in Thermal

1. Choose **Find your starting point**, then **Explore robotics research**. Open a node and inspect its official source, access requirements, and catalog check date.
2. Save a resource. Reload the page and open **Saved**. Restart the API and repeat: the record remains in PostgreSQL.
3. Open a separate browser profile/private window. Its saved list should start empty. Workspaces are browser-specific, not signed-in accounts or cross-device identities.
4. Search for a startup goal and compare results with robotics. Search for an unmatched phrase; the UI should offer another search or the full catalog instead of substituting a fixed goal.
5. Open **Events** and follow an actual source listing. Dates are displayed in Eastern time, with the source snapshot date.
6. Stop the API and try a request. The UI must show failure and allow retry, without inventing success or falling back to sample people.
7. Open an old `#/reply/5` link. It explains that prototype asks are not real outreach; the API returns 404 instead of synthesizing an ask.
8. In the goal form, choose a public job example and **Match topics**. Open CS 1332 or a VIP project to see the shared topics and employer source. Browse the catalog for courses such as CS 3210; its panel separates curriculum coverage from alumni evidence.

Saving highlights a resource; it does not claim the user participated in that activity. Resource connections are illustrative discovery links, not empirical alumni trajectories. Search currently uses deterministic keyword matching in SQL, with no LLM or vector search.

## Automated verification

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q
.\.venv\Scripts\python.exe backend/tests/check_thermal.py
```

Run API tests before browser tests, since their cleanup shares the test database. The first command uses the separate `warmpath_test` PostgreSQL database and checks its name before exercising writes. Tests cover persistence across a fresh API instance, browser isolation, idempotent saves, input validation, missing alumni/ask data, cross-origin writes, and source parsing. The second command needs the API running and uses headless Microsoft Edge with isolated temporary browser contexts. It checks search, save/reload, isolation, events, no-match, request failure/retry, and JavaScript errors. Screenshots go into ignored `.local/`.

## Reproduce on another Windows machine

Install a supported Python version (this setup was tested on Python 3.14.5), then:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
```

Download PostgreSQL 17 Windows x64 binaries from the [official EDB archive page](https://www.enterprisedb.com/download-postgresql-binaries), and extract so `.local/postgresql/pgsql/bin/postgres.exe` exists. This machine used version 17.12. No system service is installed. Then:

```powershell
.\.venv\Scripts\python.exe -m backend.manage init
.\.venv\Scripts\python.exe -m backend.manage migrate
.\.venv\Scripts\python.exe -m backend.api.sync_events
.\.venv\Scripts\python.exe -m backend.manage run
```

Initialization creates development/test databases with SCRAM password authentication and loopback-only listening. A random local password is stored in ignored `.local/database.json`; do not publish or share that directory. Do not delete `.local/pgdata` to reset the UI: it contains saved data. The initial API tables use the `api_` prefix and an additive local bootstrap; coordinate a production schema/migration plan with role 1 before deployment. The local DB role is administrative, not a proposed production application role.

The app also accepts a `DATABASE_URL` for an existing PostgreSQL database; the test suite uses `TEST_DATABASE_URL` or the local `warmpath_test` database. These are server environment variables, never frontend configuration. The project-local manager still manages its own local cluster; for an external database run Uvicorn directly.

## Technologies in use

| Technology | Purpose |
| --- | --- |
| HTML/CSS, React, Three.js/react-three-fiber, ShaderGradient | Thermal UI and existing honeycomb/gradient visuals |
| JavaScript fetch / HTTP / JSON | Same-origin asynchronous requests with timeout/error handling |
| Python / FastAPI / Uvicorn | Request handlers, validation, application server, and interactive API docs |
| Pydantic | Validates API inputs, profiles, imports and posts |
| SQLAlchemy / Psycopg / PostgreSQL | Database queries, transactions, and persistent workspaces, resources/events, accounts/profiles, courses and posts |
| Alembic | Explicit shared schema migrations, including profiles, courses and community post revisions |
| Python standard XML/JSON parsers | Import bounded public event metadata; reject unsupported input |
| pytest / HTTPX / Playwright | API/database/parser tests and actual browser verification |

Docker, external identity providers, AI/speech providers and AWS hosting are not configured. Local password accounts and Alembic migrations are implemented. PostgreSQL on RDS remains the planned cloud database. Follow the [budget plan](backend-design.md#100-total-aws-budget) before any scheduled cloud test.
