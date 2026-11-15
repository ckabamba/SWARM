# backend/engine: shared schema and migrations

Owned by role 1 (data, discovery engine, and event sources). This folder holds the WarmPath database schema as migration files. Tables are never created or edited by hand in AWS; every change is a new migration that goes through a pull request.

The schema here is a draft. See [What exists so far](#what-exists-so-far) for what is and is not modeled yet.

## One-time setup

You need Python 3.11 or newer. For a local database you also need Docker Desktop.

From the repo root:

```sh
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux:        source .venv/bin/activate
pip install -r backend/engine/requirements.txt
```

Copy `.env.example` to `.env` at the repo root. It is already set up for the local database. `.env` is ignored by git.

## Local database

```sh
docker compose -f backend/engine/docker-compose.yml up -d --wait
cd backend/engine
alembic upgrade head
```

This starts PostgreSQL 18 on `localhost:5432` and creates the tables. The local username, password, and database name are all `warmpath`.

To wipe the local database and start again:

```sh
docker compose -f backend/engine/docker-compose.yml down -v
```

## Shared AWS database

The shared database is PostgreSQL 18 on Amazon RDS. To point migrations at it, set `DATABASE_URL` in your `.env` to the RDS form shown in `.env.example`, using the endpoint and password from the data owner. Your IP address must also be allowed in the database's security group.

Commands that connect to the database, such as `upgrade`, `downgrade`, and `current`, print the target database and host before they run. Check that line before applying a migration to the shared database, and apply a migration there only after its pull request is merged.

## Common commands

Run these from `backend/engine`.

| Command | What it does |
| --- | --- |
| `alembic upgrade head` | Apply all migrations that have not been applied yet |
| `alembic current` | Show which migration the database is on |
| `alembic history` | List all migrations |
| `alembic downgrade -1` | Undo the most recent migration |
| `alembic revision -m "add club table"` | Create a new, empty migration file to fill in |

## Changing the schema

1. Create a branch and run `alembic revision -m "<what changes>"`.
2. Fill in `upgrade()` and `downgrade()` in the new file under `migrations/versions/`. Give the file a numbered name that follows the existing ones, such as `0002_add_club.py`, and set `revision` to match.
3. Run `alembic upgrade head` and then `alembic downgrade -1` against your local database to check both directions.
4. Open a pull request. Do not edit a migration that has already been merged; add a new one.

Coordinate with role 2 before a change that affects an API response, and update `docs/mvp.md` in the same pull request if a documented shape changes.

## What exists so far

Migration `0001` creates four tables. It covers only the parts that the open resource decision in [issue #14](https://github.com/ckabamba/SWARM/issues/14) does not affect.

| Table | Holds | Notes |
| --- | --- | --- |
| `alumni_city` | A normalized city with region, country code, and coordinates | City-level only, never a live position |
| `campus_place` | A campus building or outdoor place with coordinates | Room numbers will belong to the event, not the place |
| `person` | A student or alum profile: name, kind, major, graduation year, optional city | `share_city` and `profile_visible` control what others see; `is_fixture` marks generated demo people |
| `post` | A community post: author, body, timestamps | Links to clubs, events, and resources come later |

Not modeled yet:

- **Activity, PersonActivity, Event, and Ask** from the path feature, plus clubs and resources. These wait for the decision in issue #14.
- **Accounts and login.** The identity approach is undecided ([issue #16](https://github.com/ckabamba/SWARM/issues/16)). An account table will reference `person`.
- **School year.** `docs/mvp.md` returns `school_year` for students but the Person draft has no such column. Whether to store it or derive it from `grad_year` is undecided.
- **Finer visibility rules.** `profile_visible` is a single on/off switch. Issue #16 may need more levels.
- **PostGIS.** Coordinates are plain latitude and longitude columns for now.
