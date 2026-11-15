# Running WarmPath after cloning

Cloning downloads source code, not a running website. `.venv/`, `.local/` and `.env` are intentionally excluded: dependencies, database files and credentials belong to each development environment. `localhost` means the viewer's own computer, not Christofort's computer or a shared backend.

**Students/alumni using the service should open one hosted HTTPS URL and install nothing.** No shared application URL is configured in this repository yet. Hosting the UI and `/api` together, with a server-side connection to PostgreSQL, is a separate deployment step. Uploading HTML to a static host does not run the API.

**Teammates developing from a clone** can use the setup below. The app already discovers `/api` on the same origin, so no browser API address or port mapping is required. The only database connection setting is server-side `DATABASE_URL` in the repository root `.env` (process environment variables take precedence).

## First setup: Docker PostgreSQL and Python

Install Python 3.11+ and Docker with Compose, and start Docker. Run all commands from the repository directory containing `README.md` and `backend/`.

Create `.env` by copying `.env.example` **only if you do not already have one**. Its default database URL matches the team's Docker database on port 5432. Do not copy another person's credentials or point local experiments at a shared database.

On Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
docker compose -f backend/engine/docker-compose.yml up -d --wait
.\.venv\Scripts\python.exe -m backend.manage migrate
.\.venv\Scripts\python.exe -m backend.manage run
```

On macOS/Linux:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements-dev.txt
docker compose -f backend/engine/docker-compose.yml up -d --wait
.venv/bin/python -m backend.manage migrate
.venv/bin/python -m backend.manage run
```

Open **http://127.0.0.1:8000/thermal/**. This single Python server serves the connected resource UI, Social Jackets, profiles, courses and API. Do not open the HTML file directly, use VS Code Live Server, or serve `prototypes/` with a static-only server for these features.

To fetch public event listings, run `python -m backend.api.sync_events` using the same virtual-environment Python in another terminal. Without a successful refresh, the event list may be empty. The resource catalog is loaded at startup; no fake profiles or posts are added.

If PostgreSQL is already installed locally, set `.env` to that database instead and skip the Docker command. Plain `postgresql://`, `postgres://` and `postgresql+psycopg://` URLs use the installed psycopg 3 driver. A configured `DATABASE_URL` skips the optional Windows portable cluster entirely.

The existing Windows portable setup remains supported: with no `DATABASE_URL`, the launcher uses ignored `.local/database.json` and PostgreSQL on port 55432. Its setup is in [the local testing guide](backend-local-testing.md#reproduce-on-another-windows-machine). Do not copy the Docker `.env` into an existing portable setup unless intentionally switching databases; existing records are not transferred between databases.

## After a pull

Update packages if requirements changed, start the database, apply migrations, then run the app. In a terminal with the virtual environment activated:

```sh
pip install -r backend/requirements-dev.txt
docker compose -f backend/engine/docker-compose.yml up -d --wait
python -m backend.manage migrate
python -m backend.manage run
```

The Docker command is unnecessary for the portable setup. Migrations remain an explicit step before startup. To stop the Docker database while retaining records, use `docker compose -f backend/engine/docker-compose.yml stop`; avoid `down -v`, which removes its data volume.

## The separate React/Vite client

The newly pulled `frontend/` application is a separate evolving client. It defaults to fixtures and can run without the backend. In `VITE_DATA_SOURCE=api` mode it reads community posts/events via Vite's `/api` proxy. Its composer, profile and path screens are still prototypes; use the connected Thermal URL above to test saved profiles, posts and transcripts. See [frontend setup](../frontend/README.md).

For React development, start the backend as above, install the frontend packages, and run `npm run dev` in `frontend/`. No custom API URL is needed: Vite forwards `/api` automatically. `npm run preview` and static production hosting do not provide that development proxy.

## Diagnose a connection problem

| Symptom | Check |
| --- | --- |
| Downloaded HTML or static preview cannot connect | Open `http://127.0.0.1:8000/thermal/` from the running app server. |
| Missing Python module | Install `backend/requirements-dev.txt` using the same virtual-environment Python used to run the server. |
| Missing Windows PostgreSQL binaries on another machine | Use the Docker/existing database URL in root `.env`; the launcher then skips portable PostgreSQL. |
| Database connection refused | Start the selected PostgreSQL instance; check `.env` host/port and whether another service already owns port 5432. |
| Missing shared tables/columns | Stop the API, run `python -m backend.manage migrate` against the selected database, then restart. |
| API works but Vite fails | Run both servers, restart Vite after changing `frontend/.env`, and use `localhost` or `127.0.0.1`. |
| UI connects but has no events/posts | Refresh event sources; posts appear only after a real account publishes with a public profile. |

`http://127.0.0.1:8000/api/health` checks the process; `/api/ready` checks its database connection. Neither endpoint displays credentials. Each developer's local database has its own records; separate clones do not automatically share accounts/posts.

For automated tests, create the isolated database before configuring `TEST_DATABASE_URL`:

```sh
docker compose -f backend/engine/docker-compose.yml exec db createdb -U warmpath warmpath_test
# Set TEST_DATABASE_URL in .env to the commented test example, then:
python -m pytest backend/tests -q
```

Run `createdb` only once. Tests refuse databases not named `warmpath_test`. Never set the test URL to the development or shared database.

## One shared URL for users

The service is prepared to serve Thermal and `/api` together from one host. The deployment operator must provide PostgreSQL, apply migrations, run the API continuously and configure HTTPS. On that server:

- Set `DATABASE_URL` to the server-accessible database, with TLS where required. Keep it out of frontend configuration.
- Set `WARMPATH_PUBLIC_ORIGIN` to the exact external HTTPS origin, for example `https://app.example.edu`. The backend allows that hostname, validates browser write origins against it and marks session/workspace cookies Secure. This setting does not create a domain or TLS certificate.
- Set `WARMPATH_HOST=0.0.0.0` only when the deployment network needs it, and `PORT` to the assigned port. Development defaults remain loopback and port 8000.
- Route the full site to FastAPI, preserving the external Host header. If TLS terminates at a reverse proxy, trust forwarded headers only from that proxy's addresses (`FORWARDED_ALLOW_IPS` for Uvicorn). Keep the API port private to the proxy; do not blindly trust every client or open PostgreSQL to the internet.
- Refresh public events on an operator-controlled schedule. Verify accounts, posts and courses across two browsers at the HTTPS URL before sharing it.

Users then open the shared URL and need no local environment. The $100 total AWS budget still requires a costed hosting window and cleanup plan before provisioning; see [the budget plan](backend-design.md#100-total-aws-budget). These changes do not deploy or incur AWS charges. Local accounts still lack GT/email verification, password recovery and production moderation.
