# MVP spec

This expands "MVP stack and build order" in [alumni-path-map.md](alumni-path-map.md). The folder layout, JSON shapes and thresholds below are a starting draft. Confirm them in the first 30 minutes, then change them only by pull request.

## Done means

The MVP is the two-minute demo running end to end on a public URL, on seeded data:

1. Typing a seeded goal draws the path map: you, the stops and the goal, with a count on each stop.
2. Switching student changes the flagged next stop and the top three alumni.
3. Tapping an alum shows the shared tie and a drafted message, and Ask creates a request.
4. The reply page on a second device shows the request. One tap accepts it, and the first device shows it as accepted.
5. The flagged stop shows its next event.
6. A seeded goal that is not an internship (research, startup, grad school) also returns a path.

Out of scope: login, chat, a general events feed, real data import, mobile layout.

## Decide in the first 30 minutes

| Decision | Options | Suggested |
| --- | --- | --- |
| Backend framework | FastAPI or Django | FastAPI, because the app is a handful of JSON endpoints |
| Database | Postgres, or Firestore on Google Cloud | Postgres, because the lift query is plain SQL |
| LLM | Any chat and embedding API; Gemini on Google Cloud | Whichever the team already has a key for |
| JSON shapes | The draft under "API contract" | Lock them so both front-end people can build against fake data |

## Repo layout

One folder per role, so that no two people edit the same files. The numbers are the roles in the [README](../README.md#team).

| Path | Role | Holds |
| --- | --- | --- |
| `backend/engine/` | 1 | Schema, lift query, people ranking |
| `backend/seed/` | 1 | Seed script and planted patterns |
| `backend/api/` | 2 | Endpoints, goal parsing, drafted messages, deployment config |
| `backend/events/` | 5 | Engage and career-event parser, event-to-stop matching |
| `frontend/src/map/` | 3 | Goal box, graph, event badges, student switcher |
| `frontend/src/people/` | 4 | People panel, Ask flow, alum reply page, event post form, colours and type |
| `pitch/` | 5 | Slides and demo script |
| `docs/` | Everyone | The vision doc and this spec |

## Data model

| Table | Columns |
| --- | --- |
| Person | `id`, `name`, `major`, `grad_year`, `kind` (student or alum), `city` |
| Activity | `id`, `name`, `type` (vip, club, course, lab, internship, job), `company`, `role` |
| PersonActivity | `person_id`, `activity_id`, `school_year` (1 to 4; 5 or more means after graduation) |
| Event | `id`, `title`, `starts_at`, `location`, `link`, `source` (parsed or posted), `activity_id` |
| Ask | `id`, `student_id`, `alum_id`, `goal_id`, `message`, `status` (sent, accepted, ignored, completed), `created_at` |

For the MVP a goal is one target Activity row, seeded once per demo goal, so `goal_id` is an Activity `id`. Matching near goals with embeddings comes later.

Ask is not in the vision doc's table list. It is what "log every accept, ignore and completed call" needs.

## Scoring

**Stops.** For each activity that achievers did before the target:

```
lift = (achievers who did it / all achievers) / (alumni who did it / all alumni)
```

Keep activities with a lift of 1.5 or more and at least 3 achievers, and show the top 5 by lift. Tune both numbers on the seed data. A stop is `have` when the student already has that activity, and `next` is the highest-lift stop the student does not have. Label stops with counts ("9 of 14 did this"), never with causal wording.

**People.** A plain weighted sum over the vision doc's signals is enough: shared activities weigh most, then same major, then year. Return the strongest shared tie as a sentence, for the people panel and the drafted message.

## API contract

Draft. All bodies are JSON and all paths start with `/api`.

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
      "event": {
        "id": 40,
        "title": "Info session",
        "starts_at": "2026-11-17T18:00:00-05:00",
        "location": "Example Hall 101",
        "link": "https://example.com/event"
      }
    }
  ],
  "events": []
}
```

`stops` is sorted by lift. A stop's `event` is its next event, or `null`. The top-level `events` array holds the same event objects plus `activity_id`, for the "This week on your path" strip, sorted by date.

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

`POST /asks` with `{ "student_id": 1, "alum_id": 87, "goal_id": 12, "message": "..." }` returns `{ "id": 5, "status": "sent", "reply_url": "/reply/5" }`.

`GET /asks/5` returns `{ "id": 5, "status": "sent", "student": { ... }, "alum": { ... }, "shared_tie": "...", "message": "..." }`, and `POST /asks/5/accept` returns the same object with `"status": "accepted"`.

`POST /events` takes `{ "title", "starts_at", "location", "link", "activity_id" }` and returns the created event.

## LLM use

Two prompts only: parse the goal into a target Activity, and draft the ask. Both need a fallback that works with no API key and no network: match the goal text against the seeded goals by keyword, and fill a message template with the shared tie. The demo must not depend on a live LLM call.

## Seed data

- About 300 alumni and two students: a CompE second-year and a CS first-year.
- Plant the patterns the demo depends on: NVIDIA interns over-represented on two VIP teams, and one club that nearly everyone joins, which should score near 1 and drop out.
- Give the two students different current activities, so that their flagged next stop and their top three alumni differ. Stops are scored across all achievers, so the difference between students comes only from what each already has and from the people ranking.
- Seed one goal Activity each for research, a startup and grad school, a `city` on every alum, and about 20 events attached to stops.
