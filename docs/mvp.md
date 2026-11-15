# MVP spec

Community contract update: [Social Jackets](community.md#api-contract) implements public feed/detail routes, authenticated post creation, author-owned edits/deletes, keyset pagination, safe create retries and linked resources/events. It shares local accounts and explicit public-profile visibility; migration `0004` extends the shared `post` table.

Course contract update: [My Courses and transcript import](courses-and-transcripts.md#migration-and-api-contract-changes) separates course persistence from general profiles. `/me` excludes the embedded course array; use `/me/courses` and `/transcripts/*`. Resume imports selecting courses require `courses_version`. Course revisions are independent, and transcript drafts exclude raw text/grade/GPA columns. These changes are implemented in connected Thermal; other clients need corresponding integration.

Implemented contract update: [local profiles and resume import](profiles-and-resumes.md#api-contract) adds `/auth/*`, `/me`, `/profile-options`, `/profiles/{id}`, and `/resumes/*` alongside existing resource routes. Uses local password accounts and explicit shared migrations; production identity and the wider milestones below remain pending. Profile collection entries are self-reported and are not automatically alumni statistical evidence.

This spec follows the expanded product scope in [README.md](../README.md): paths/resource discovery through text and voice, a community feed, and interactive maps for campus activities and alumni cities, across web and mobile. [alumni-path-map.md](alumni-path-map.md) is supporting rationale for the original path feature.

The initial-release criteria below are proposed milestones, not a claim that these features exist. The existing path API draft is preserved; new service contracts and technology choices remain to be specified.

The [backend design plan](backend-design.md) and [local issue drafts](backend-issue-drafts.md) refine backend delivery. Their endpoint outline is proposed; it does not replace the existing contract below until the contract task resolves examples and compatibility with consumers.

Current delivery constraints: **$100 total AWS budget** and **Thermal as the first integrated UI** (`prototypes/thermal/index.html`). Other clients remain prototypes for now; the full release scope below remains the roadmap. Develop/test locally and use scheduled, costed cloud windows. See the [testing guide](backend-local-testing.md) and [budget plan](backend-design.md#100-total-aws-budget).

## Done means

Proposed initial release: a deployed service demonstrating all three core experiences with shared records and persistent state.

1. A user can discover campus resources and alumni paths through text and voice. Define voice input/output behavior before implementation, and keep text access usable when speech is unavailable.
2. A goal draws a path with evidence-based counts. Switching student changes the next-step indicator and relevant alumni. Include at least one goal beyond internships.
3. A student can edit and send an ask; an alum can accept it on another device and the student sees the persisted status. Acceptance records agreement to a call, not a calendar booking.
4. Students and alumni can create posts and browse a community page with a distinct section highlighting campus club activities and events.
5. An interactive campus map shows club activities/events by physical location and opens their details.
6. An interactive alumni map shows cities where alumni are based and allows users to explore the relevant people. City counts and filters by company, industry, major, or shared clubs are proposed details.
7. A club, event, or person reached through different experiences resolves to the same record. Posted updates remain consistent across views.
8. All three experiences work on mobile as well as web, using a delivery approach the team selects.
9. Real-user content is attributed to the correct account and respects the defined profile visibility. Generated demonstration data is clearly distinguished from real records.

Accounts and login, real profiles, community content, geographic maps, and mobile are no longer excluded. Private messaging, reactions, comments, follows, calendar booking, and specific import integrations remain undecided rather than implicit release requirements.

## Decisions before implementation

**Recorded hosting decision:** AWS, with PostgreSQL as the database on Amazon RDS for PostgreSQL ([#3](https://github.com/ckabamba/SWARM/issues/3)). This replaces the earlier Google Cloud decision. The specific AWS services are a working proposal until the owning roles confirm them: AWS Amplify Hosting for the web frontend and a container on Amazon ECS Express Mode (Fargate) for the backend. A named billing owner, free-plan credit eligibility, and current pricing must be verified before provisioning. Environment setup and release checks are tracked in [#21](https://github.com/ckabamba/SWARM/issues/21).

| Decision | Working proposal or open question |
| --- | --- |
| Backend framework | FastAPI is the working proposal; Django remains an alternative. Role 2 confirms for the expanded service. |
| Database | PostgreSQL on Amazon RDS is decided. Define the schema; PostGIS for places and cities is proposed, and pgvector depends on [#14](https://github.com/ckabamba/SWARM/issues/14). |
| AWS services | Amplify Hosting for the web frontend and ECS Express Mode (Fargate) for the backend are proposed. Confirm them, the region, and the shared account setup. |
| Accounts and profiles | Define identity/login approach, student/alumni roles, author ownership, and visibility. |
| AI and voice | Select providers; specify voice input, spoken output, conversation behavior, grounding, timeouts, and fallbacks. |
| Geographic maps | Select provider/library; define campus locations and normalized alumni cities. |
| Mobile delivery | An Expo Go prototype exists in `mobile/`; define connected integration, release packaging, and distribution for all three experiences. |
| Community | Define post fields and club/event highlighting. Reactions, comments, follows, and private messaging are not yet committed. |
| Data sources | Define user-entered profiles/posts, club-maintained information, and permitted public event sources/imports. |
| API contracts | Preserve existing consumers; specify expanded shapes, errors, pagination, and visibility before integration. |
| Ownership | Confirm the remaining full-role owner names for roles 3 and 5; confirm framework-dependent mobile paths when choosing mobile delivery. |

Implementation work is linked from the [README issue index](../README.md#implementation-issues). [#14](https://github.com/ckabamba/SWARM/issues/14) still holds the resource-source/model decisions affecting schema, fixtures, and the engine; expanding the product scope does not settle extraction methods or fallback semantics. The voice, mobile, and map issues likewise retain open technology and interaction decisions.

## Repo layout

The five roles in the [README](../README.md#team) own the areas below. These are planned production folders; current prototypes are under `prototypes/` and `mobile/`. Ezekiel Currie owns role 1, Christofort Kabamba owns role 2, and Shehryar Sardar owns role 4; Alfred Tang has claimed role 3 discovery UI work in #19. Remaining full-role assignments for roles 3 and 5 still need confirmation. This replaces the previous path-only allocation: event ingestion moves to role 1, the people/Ask flow moves to role 3, and role 5 owns geographic-map interfaces as well as demo coordination. No code is moved by this documentation update.

| Path | Role | Holds |
| --- | --- | --- |
| `backend/engine/` | 1 | Shared schema/migrations, path calculations, people ranking, resource queries, and location normalization |
| `backend/seed/` | 1 | Fixtures for profiles, paths, posts, clubs, resources, events, and cities |
| `backend/events/` | 1 | Permitted event sources/imports, source attribution, and matching to clubs, activities, and locations |
| `backend/api/` | 2 | Shared contracts/endpoints, account/access logic, persistence, search orchestration, AI/speech integrations, and deployment config |
| `frontend/src/map/` | 3 | Alumni path graph, path-event badges, and personalization; geographic maps live separately |
| `frontend/src/discovery/` | 3 | Resource search/results and text/voice interaction controls |
| `frontend/src/people/` | 3 | Shared ties, people panel, drafted asks, and alum reply page |
| `frontend/src/community/` | 4 | Post composer/feed, club/event highlights, and event posting forms |
| `frontend/src/profile/` | 4 | Account/profile screens, login UI, and profile visibility controls |
| `frontend/src/app/` | 4 | Shared app entry, navigation, routes, and client configuration |
| `frontend/src/shared/` | 4 | Shared components and design tokens used by all frontend owners |
| `frontend/src/geo/` | 5 | Campus activity map, alumni-city map, geographic details, and agreed filters |
| `pitch/` | 5, with all roles contributing | Integrated demo script, slides, and rehearsed feature handoffs |
| `docs/`, `README.md`, `AGENTS.md` | Shared | Product scope, ownership, contracts, and agent guidance |
| `DESIGN.md` | 4, coordinating with 3 and 5 | Shared visual language and interaction/layout guidance |

The new frontend paths are a proposed folder layout with assigned role owners, not a framework choice. Role 4 coordinates shared frontend manifests/build configuration when the application is scaffolded. Prototype changes are coordinated explicitly because each prototype currently combines multiple features in one file.

### Mobile ownership

Roles 3, 4, and 5 own mobile implementations and checks for their respective features. Role 4 coordinates the shared app shell, navigation, packaging, and integration. Roles 1 and 2 provide the common data and APIs for both web and mobile. The Expo Go prototype now lives in `mobile/`; coordinate its shared store and types with role 4 and assign feature changes along these same ownership boundaries. Its local-data behavior is described in [the mobile spec](WARMPATH_MOBILE_SPEC.md); backend migration is planned in [the backend design](backend-design.md#client-migration).

### Integration handoffs

- **Data to API:** role 1 owns schema/migrations and query behavior; role 2 owns request validation, access rules, transactions, and HTTP responses. Agree on callable interfaces and coordinate schema changes.
- **AI and voice:** role 2 owns providers, grounding, orchestration, and fallbacks; role 3 owns microphone/text controls, interaction states, and result presentation. Define speech input/output behavior together.
- **Events and maps:** role 1 supplies sourced events and normalized places/cities; role 2 exposes shared records and applies visibility; role 4 presents event highlights/forms; role 5 presents geographic results. Role 3 uses the same records in discovery and paths.
- **Community and identity:** role 4 owns post/profile/account UI; role 2 owns author/access enforcement and persistence; role 1 owns the underlying schema.
- **Shared UI and release:** roles 3 and 5 coordinate route/component changes with role 4. Each role verifies its feature; role 2 handles backend deployment, role 4 client delivery, and role 5 the integrated demo with all owners participating.

## Data model

### Existing path-feature draft

These tables describe the original feature and are not a complete schema for the expanded service.

| Table | Columns |
| --- | --- |
| Person | `id`, `name`, `major`, `grad_year`, `kind` (student or alum), `city` |
| Activity | `id`, `name`, `type` (vip, club, course, lab, internship, job), `company`, `role` |
| PersonActivity | `person_id`, `activity_id`, `school_year` (1 to 4; 5 or more means after graduation) |
| Event | `id`, `title`, `starts_at`, `location`, `link`, `source` (parsed or posted), `activity_id` |
| Ask | `id`, `student_id`, `alum_id`, `goal_id`, `message`, `status` (sent, accepted, ignored, completed), `created_at` |

In the existing path-feature draft, a goal is one target Activity row, so `goal_id` is an Activity `id`. Development fixtures seed one per demonstration goal. Broader resource queries need not resolve to an Activity; specify their own contract. Embedding-based matching remains optional and undecided.

The current Ask flow creates and accepts requests. The listed ignored/completed states do not yet have specified transitions.

Of these, `person`, `activity`, and `person_activity` exist as migrations under `backend/engine/`. They differ from the draft above in three ways: `person.city_id` references a normalized `alumni_city` row instead of holding free text; `activity` and `person` carry an `is_fixture` flag for generated demo rows; and `person_activity` holds one row per person and activity, where `school_year` is the year the person first did it. Event and Ask are not migrated yet.

### Proposed shared data additions

| Area | Data to define with the data owner |
| --- | --- |
| Account and profile | Identity, author/profile relationship, student/alumni role, school year, profile visibility, shared city |
| Club/organization | Stable ID, name, description, resources, and event relationships |
| Resource | Campus service, course, opportunity, or other discoverable item; source/link and related club/activity |
| Post | Author, content, timestamps, and optional links to shared club/event/resource records |
| Campus location | Stable place ID, display name, coordinates, and links to event/activity records |
| Alumni city | Normalized city ID, region/country, city coordinates, and profiles that choose to share that city |
| Event extensions | Organizer/club, location reference, source, and shared activity/resource links |

These are requirements to design, not finalized table definitions or migrations. Map coordinates represent campus places or cities, not live alumni positions. Decide how profile visibility affects both city counts and people lists.

The event location reference exists. `campus_place` holds 22 campus buildings with coordinates from OpenStreetMap, and `event_place` links each imported public event to one of them with a `kind` of `campus`, `online`, or `unknown`, plus the room when the listing gave one. `backend/events/places.py` writes the links by matching the listing's location text against known building names, and `events_with_places(conn)` returns each event with `location_kind`, `room`, and a `place` of `{ id, name, latitude, longitude }` or `null`. No API route serves this yet. Links from events to clubs, activities, and resources are still to be built.

Two earlier contract gaps are settled in the path engine. A student's `school_year` is not stored: it is derived from `grad_year`, assuming a four-year degree and an academic year that starts in August. `stops[].typical_year` is now returned, as described under the path contract below. One gap remains: Ask responses below contain placeholders. Do not silently adopt extra fields or infer missing schemas.

## Scoring

These rules apply to the alumni-path feature. General resource discovery, community ordering, and geographic map results need separate rules; a common campus resource must not disappear everywhere simply because its alumni-path lift is low.

**Stops.** For each activity that achievers did before the target:

```
lift = (achievers who did it / all achievers) / (alumni who did it / all alumni)
```

For example, 40% of goal achievers versus 10% of all alumni gives a lift of 4. A lift of 1 means the same prevalence. This measures association, not causation; small samples can produce misleadingly high values.

The original proposed defaults keep activities with a lift of 1.5 or more and at least 3 achievers, and show the top 5 by lift. Tune both numbers on the seed data. A stop is `have` when the student already has that activity, and `next` is the highest-lift stop the student does not have. Label stops with counts ("9 of 14 did this"), never with causal wording.

**People.** The existing path proposal uses a weighted sum: shared activities weigh most, then same major, then year. Return the strongest shared tie as a sentence, for the people panel and the drafted message.

**As implemented** in `backend/engine/paths.py`:

- An activity counts as done "before the target" when its `school_year` is lower than the year the same alum reached the goal. Activities from the same year as the goal are left out, because the data cannot say which came first.
- Only alumni with `profile_visible` set are counted or listed. Hidden profiles do not contribute to `achievers`, to lift, or to people lists.
- The people score is `0.6 × shared activities (capped at 3, divided by 3) + 0.25 if same major + 0.15 × graduation-year closeness`, where closeness falls from 1 to 0 across 10 years. These weights are starting values to tune.
- The shared tie sentence is built only from rows in the database. It is `null` when the student and alum share no activity and no major.

## API contract

### Implemented local Thermal slice

The current local service implements resource discovery and public event snapshots, not the historical alumni-path contract below. Real alumni histories are not connected. Local accounts/profiles, courses/transcripts and community posts use the separate implemented contracts linked above. All paths use `/api`; see [run/test instructions](backend-local-testing.md).

| Route | Current behavior |
| --- | --- |
| `GET /health`, `GET /ready` | Process health and PostgreSQL readiness |
| `GET /session` | Creates/reuses an opaque HttpOnly, SameSite=Strict browser-workspace cookie; returns saved goal, catalog count, suggestions, and unavailable alumni status |
| `POST /path` | `{ "goal": "Explore robotics research" }`; returns original goal label, up to five real `resources`, `matched`/`no_match`, `matching: "keyword"`, and unavailable evidence with null achievers/lift |
| `GET /jobs` | Two curated public employer examples with source links, topic labels, location/context, and check dates; not a live vacancy feed |
| `GET /resources?saved_only=false` | `{ "items": [...] }` for the catalog or the current workspace's saved list |
| `PUT/DELETE /saved/{resource_id}` | Idempotent save/remove in the current workspace; returns `{ "id": 9, "saved": true }` or false |
| `GET /events` | Up to 12 unexpired public listings from the latest successful source snapshots, with source/retrieval timestamps and stale status |
| `GET /people` | Explicit empty/unavailable result; no sample alumni |
| `GET /asks/{id}` | 404; prototype asks are not real outreach |

A resource has `id`, `name`, `kind`, `summary`, `url`, `source_url`, `access`, `verified_on`, and `saved`. Events have `url`, `title`, `starts_at`, `ends_at`, `fetched_at`, `source`, and nullable `location`/`organizer`/`description`. `description` is the listing's own text with markup removed, at most 4,000 characters; for calendar-feed events it is the body only, without the contact details that follow it. It is untrusted text: render it as text, and pass it to a model as data, never as instructions. Dates/timestamps retain explicit time zones; the client formats event times in Eastern time. Error responses use `{ "error": { "code": "...", "message": "..." } }` with 401, 403, 404, 422, or 503 as appropriate. This local slice has no student impersonation, public ask acceptance, LLM calls, or production identity model.

Resources additionally return `topics`, `evidence_basis` (`course_catalog`, `project_description`, or `public_resource`), and `related_jobs`. Each related job includes `matched_topics` and `match_basis: "description_topic_overlap"`. `POST /path` optionally accepts `job_id` from `/jobs`; it then orders resources by SQL topic overlap, returns the selected `job`, and sets `matching: "description_topic_overlap"`. Unknown job IDs return 404. Counts/lift remain null: content relevance does not require or imply verified alumni attendance. See [evidence and LinkedIn decisions](data-evidence-and-linkedin.md).

The initial schema under `backend/api/` is a bounded local resource/workspace/event implementation using `api_` tables. It does not finalize role 1's broader schema or #14's extraction/matching design. Browser-workspace saves persist across restarts but are not cross-device account synchronization. The resource graph is a discovery illustration and has no statistical ranking claims.

### Existing path-feature contract

Historical draft, retained for the other path prototypes and future alumni work. These shapes are not implemented by the current real-resource Thermal slice above. All bodies are JSON and all paths start with `/api`. These endpoints do not yet constitute the full service API.

| Method and path | Purpose |
| --- | --- |
| `GET /students` | Profiles for the student switcher |
| `POST /path` | Free-text goal in, full JSON for the map out |
| `GET /people` | Ranked alumni behind a stop or the goal |
| `POST /asks` | Send an ask; returns the reply-page link |
| `GET /asks/{id}` | One ask, for the alum reply page and for the student to poll its status |
| `POST /asks/{id}/accept` | The alum accepts the call |
| `POST /events` | The event post form |

`POST /path` with `{ "goal": "SWE internship at NVIDIA", "student_id": 1 }` returns:

```json
{
  "goal": { "id": 12, "label": "SWE internship at NVIDIA", "achievers": 14 },
  "student": { "id": 1, "name": "Sample Student", "major": "CompE", "school_year": 2 },
  "stops": [
    {
      "activity_id": 3,
      "name": "Example VIP team",
      "type": "vip",
      "achievers": 9,
      "lift": 4.1,
      "have": false,
      "next": true,
      "typical_year": 2,
      "event": {
        "id": 40,
        "title": "Info session",
        "starts_at": "2026-11-17T18:00:00-05:00",
        "location": "Example Hall 101",
        "link": "https://example.com/event"
      }
    }
  ],
  "events": [],
  "reason": null,
  "fixture_evidence": false
}
```

`stops` is sorted by lift. A stop's `event` is its next event, or `null`. The top-level `events` array holds the same event objects plus `activity_id`, for the "This week on your path" strip, sorted by date.

Three fields were added with the path engine:

- `stops[].typical_year` is the median `school_year` in which achievers did that activity. The path map uses it to place stops left to right.
- `reason` is `null` when there are stops. When `stops` is empty it is `"not_enough_achievers"` (fewer than 3 visible alumni reached the goal) or `"no_stop_meets_threshold"`. Thin data is a normal response, not an error.
- `fixture_evidence` is `true` when generated demo alumni are part of the counts. Clients must label such results as demo data.

The engine in `backend/engine/paths.py` produces this shape from a goal Activity id and a student id. It returns `event: null` and `events: []` until events are matched to activities ([#12](https://github.com/ckabamba/SWARM/issues/12)), and it does not parse free-text goals. Serving it over HTTP is role 2's work in [#8](https://github.com/ckabamba/SWARM/issues/8); the local `POST /path` above still returns resource matches only.

`GET /people?goal_id=12&student_id=1&activity_id=3` returns the following. Leave out `activity_id` to get the alumni behind the goal itself.

```json
[
  {
    "id": 87,
    "name": "Sample Alum",
    "major": "CompE",
    "grad_year": 2023,
    "shared_tie": "You are both CompE and both joined Example VIP team in second year",
    "score": 0.82,
    "draft": "Hi Sample, ..."
  }
]
```

The engine supplies every field above except `draft`, which the API layer adds. `shared_tie` may be `null`.

`POST /asks` with `{ "student_id": 1, "alum_id": 87, "goal_id": 12, "message": "..." }` returns `{ "id": 5, "status": "sent", "reply_url": "/reply/5" }`.

`GET /asks/5` returns `{ "id": 5, "status": "sent", "student": { ... }, "alum": { ... }, "shared_tie": "...", "message": "..." }`, and `POST /asks/5/accept` returns the same object with `"status": "accepted"`.

`POST /events` takes `{ "title", "starts_at", "location", "link", "activity_id" }` and returns the created event.

### Expanded contracts to specify

Christofort Kabamba owns the service API design, coordinating schema and UI consumers. Define request/response examples and validation before implementation; this list does not introduce finalized endpoint paths.

| Capability | Contract work |
| --- | --- |
| Accounts/profiles | Identity, reading/updating profiles, author ownership, and visibility |
| Resources/clubs | Search/list/detail operations and links to shared activities, people, and events |
| Community | Local posts, pagination, ownership and resource/event links are implemented in [community.md](community.md); production moderation and club-managed event publishing remain open |
| Events/campus map | Event retrieval, location identifiers/coordinates, date/location filtering, and details |
| Alumni-city map | City identifiers/coordinates, relevant alumni, visibility, and any agreed counts/filters |
| Text/voice discovery | Input representation, resource references in results, speech handling, and failure responses |

Document changes to the existing path/event shapes in the same PR that introduces them. Web and mobile consume the same identifiers and service behavior.

## LLM use

LLM capabilities may include goal understanding, campus resource discovery, grounded explanations, and drafted outreach. The original goal parser and ask drafter remain useful, but they are not the limit of the product's AI role.

- Resolve resources, people, events, and factual answers against application data and return references users can open. Do not invent entities, shared ties, counts, or evidence.
- Compute path statistics and other defined ranking inputs in database/application logic. An LLM may explain those results without fabricating them.
- Validate model output and use bounded timeouts. Goal parsing can fall back to keyword matching; asks can fall back to a shared-tie template; broader discovery can fall back to search and browsing.
- If a goal or resource cannot be matched, return a clear no-result or clarification response rather than silently substituting an unrelated goal.
- Voice is a way to access the same discovery capabilities. Define input/output behavior and providers separately; speech transcription and synthesis need not be performed by the language model.
- Keep text access available when microphone access, speech services, or AI are unavailable. Describe degraded behavior accurately rather than promising all speech works offline.

## Development and demo data

Seeded people are fixtures, not a restriction on production users. Real student/alumni profiles and posts are supported product scope. Define sources, permissions, and visibility for real data; public event listings and club-maintained records can supply campus information.

The original path fixture plan remains useful:

- About 300 alumni and two students: a CompE second-year and a CS first-year.
- Plant the patterns the demo depends on: NVIDIA interns over-represented on two VIP teams, and one club that nearly everyone joins, which should score near 1 and drop out.
- Give the two students different current activities, so that their flagged next stop and their top three alumni differ. Stops are scored across all achievers, so the difference between students comes only from what each already has and from the people ranking.
- Seed one goal Activity each for research, a startup and grad school, a `city` on every alum, and about 20 events attached to stops.

Extend the fixture plan with authored sample posts, clubs/resources, campus locations, and several alumni cities to exercise both map views. Keep invented events explicitly marked as placeholders; any claimed real listings must retain their actual source and details. A demo should not imply that fixture counts establish real alumni outcomes.
