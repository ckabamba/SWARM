# backend/engine: shared schema and migrations

Owned by role 1 (data, discovery engine, and event sources). This folder holds the WarmPath database schema as migration files. Tables are never created or edited by hand in AWS; every change is a new migration that goes through a pull request.

The schema here is a draft. See [What exists so far](#what-exists-so-far) for what is and is not modeled yet.

## One-time setup

To run the complete connected UI/API rather than only schema tooling, use [Running WarmPath after cloning](../../docs/running-warmpath.md). The API launcher reads the same root `.env` and supports this Docker database.

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

Migrations `0002` to `0004` add accounts, profiles, courses, and post links for the API. Migration `0005` adds the two tables the path engine reads:

| Table | Holds | Notes |
| --- | --- | --- |
| `activity` | A club, VIP team, course, lab, internship, or job | A path goal is one activity row; `is_fixture` marks invented demo activities |
| `person_activity` | Which person did which activity | One row per person and activity; `school_year` is the year they first did it (5 or more means after graduation) |

Migration `0006` creates the six `api_` tables that `backend/api/app.py` defines: the resource catalog, job examples, browser workspaces, saved resources, public events, and feed snapshots. The API still creates any that are missing when it starts, so the two must stay in step: a change to those table definitions in `app.py` needs a matching migration. The migration creates empty tables; the API loads the catalog and job examples when it starts.

Migration `0007` adds `event_place`, one row per imported event. `kind` is `campus`, `online`, or `unknown`; a campus event has a `place_id` pointing at `campus_place` and, when the listing gave one, a `room`. The rows are written by [backend/events/places.py](../events/places.py), which matches each listing's free-text location against the buildings in `backend/events/campus_places.json`. A location that names no known building is recorded as unknown, never guessed. After importing events, run `python -m backend.events.places` from the repo root to load the places and refresh the links.

Migration `0008` adds a `description` column to `api_public_events`. The event import fills it with the listing's text as plain text.

Not modeled yet:

- **Event and Ask** from the path feature, plus clubs and resources. Issue #14 may also add activity types or source fields.
- **Finer visibility rules.** `profile_visible` is a single on/off switch. Issue #16 may need more levels.
- **PostGIS.** Coordinates are plain latitude and longitude columns for now.

## Path engine

[paths.py](paths.py) computes the alumni-path results from `person`, `activity`, and `person_activity`. It only reads; the API layer calls it with an open database connection.

| Function | Returns |
| --- | --- |
| `path_for_goal(conn, goal_id, student_id)` | The `POST /path` data: goal, student, lift-scored stops with `have`, `next`, and `typical_year`, plus `reason` and `fixture_evidence` |
| `people_for_goal(conn, goal_id, student_id, activity_id=None)` | Ranked alumni behind the goal or one stop, each with a factual `shared_tie` sentence and a `score` |
| `school_year(grad_year)` | A student's current school year, derived from graduation year |

Both raise `NotFound` for an unknown goal, student, or activity id. The exact shapes and scoring rules are in [docs/mvp.md](../../docs/mvp.md#scoring).

Generated test data with planted patterns lives in [backend/seed/path_fixtures.py](../seed/path_fixtures.py). It is for local and test databases only; keep it out of the shared database, where it would be counted alongside real profiles. From the repo root, `python -m backend.seed.path_fixtures` loads it into the local database, replacing any earlier fixture rows, and refuses a database on another host unless `--allow-remote` is added. Every row it creates is marked `is_fixture`. The engine's tests are in `backend/tests/test_path_engine.py`.
