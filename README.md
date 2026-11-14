# SWARM: WarmPath alumni path map

Type a goal such as "SWE internship at NVIDIA" and WarmPath shows the route Georgia Tech alumni took to get there (the VIP teams, clubs and courses they shared), highlights the alumni whose starting point was closest to yours, drafts a message to each, and shows the next event at every stop.

Built for the Georgia Tech SGA hackathon, for the prompt on connecting students with alumni.

**Status:** planning. There is no code yet, and the demo will run on seeded data.

## Screens

1. **Goal box.** One text field for the goal.
2. **Path map.** You on the left, the goal on the right, and between them the stops, sized by how many alumni who reached the goal went through each. Stops you already have are lit, and the next best stop is flagged.
3. **People panel.** The alumni behind a stop, sorted by how close their starting point was to yours, each with the tie you share and an Ask button with a drafted message.
4. **Alum reply page.** The alum sees who is asking and why, and accepts a 15-minute call in one tap.

## How it works

1. An LLM parses the goal into a target activity (role plus company).
2. Select the alumni who have that activity.
3. Score each earlier activity by lift: its share among those alumni divided by its share among all alumni. What everyone does drops out.
4. Rank those alumni by overlap with the student, and have the LLM draft the ask.

Only steps 1 and 4 use an LLM, and the rest is SQL. There is no chatbot.

## Stack

| Layer | Choice | On Google Cloud |
| --- | --- | --- |
| Front end | React with React Flow | Firebase Hosting |
| Backend | FastAPI or Django | Cloud Run |
| Database | Postgres | Cloud SQL, or Firestore |
| LLM | Any chat and embedding API | Gemini |

## Build order

Stopping after any step still leaves a demo.

1. **Seed data:** about 300 generated alumni with planted patterns.
2. **Path query:** the lift calculation as SQL, returning the top stops for a goal.
3. **Path map screen:** goal box plus the graph.
4. **People panel and drafted ask.** Events on stops come after this step.
5. **Second student profile:** same goal, different route.
6. **Alum reply page.**

Not building: login, chat, a general events feed, real data import, mobile layout.

## Team

Each role owns its own folder, so nobody shares files. Owners are to be assigned.

| # | Role | Owns | Done when | Owner |
| --- | --- | --- | --- | --- |
| 1 | Data and path engine | Schema, seed script, lift query, people ranking | A goal ID returns ranked stops and ranked alumni | TBA |
| 2 | Backend and LLM | API endpoints, goal parsing, drafted messages, deployment | Free-text goal in, full JSON for the map out, on a public URL | TBA |
| 3 | Front end: path map | Goal box, graph, event badges, student switcher | Typing a goal draws the map; switching student redraws it | TBA |
| 4 | Front end: people and forms, plus design | People panel, Ask flow, alum reply page, event post form, colours and type | Ask on one phone shows up and is accepted on another | TBA |
| 5 | Events and pitch | Event parser or hand entry, event-to-stop matching, slides, demo script, judge Q&A | 20 or more real events on stops; a rehearsed two-minute demo | TBA |

Agree on the API's JSON shapes in the first 30 minutes. The draft is in [docs/mvp.md](docs/mvp.md).

## Working in this repo

Nobody pushes to `main`, human or agent. Every change goes on a branch and reaches `main` through a pull request.

```
git switch main
git pull
git switch -c <area>/<short-topic>        # for example engine/lift-query
# make small commits
git push -u origin <area>/<short-topic>
# open a pull request into main; a teammate merges it
```

Coding agents must read [AGENTS.md](AGENTS.md) before changing anything.

## Docs

- [docs/alumni-path-map.md](docs/alumni-path-map.md): the full vision, demo script, risks and judge Q&A
- [docs/mvp.md](docs/mvp.md): MVP spec, with folder layout, data model, scoring and the API contract
- [AGENTS.md](AGENTS.md): rules for coding agents
