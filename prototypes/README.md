# WarmPath interfaces and prototypes

[Thermal](thermal/index.html) is the connected main UI: real campus resources/events, private browser-workspace saves, local accounts/profiles, reviewed resume imports, and a separate My Courses page with transcript import. It uses FastAPI/PostgreSQL and does not load the fictional path API.

[Social Jackets](thermal/community.html) connects Shehryar Sardar's community design to the same FastAPI/PostgreSQL backend. Real account holders can publish, edit and delete posts, link campus resources/events and open explicitly shared profiles. The light/dark theme remains. Thermal links to it; `thermal/index.html#/community` redirects there. Navigation returns to resources, My Profile and My Courses.

Transit and Engineering Pad were removed upstream. The React/Vite app under `frontend/` and Expo app under `mobile/` remain separate prototypes, not consumers of these backend features yet.

## Run

From the repository root after installing `backend/requirements-dev.txt` and initializing PostgreSQL:

```powershell
.\.venv\Scripts\python.exe -m backend.manage start
.\.venv\Scripts\python.exe -m backend.manage migrate
.\.venv\Scripts\python.exe -m backend.manage run
```

Open **http://127.0.0.1:8000/thermal/** or **http://127.0.0.1:8000/thermal/community.html**. Both load CDN libraries and need internet. Both need the backend; a static server cannot provide their APIs. See [local setup](../docs/backend-local-testing.md), [profiles/resumes](../docs/profiles-and-resumes.md), and [courses/transcripts](../docs/courses-and-transcripts.md).

## Evidence and persistence

Connected Thermal uses source-linked resources and public event snapshots. User-entered profiles/course histories are not verified attendance or alumni outcomes. It does not invent alumni counts, lift or sendable asks.

Social Jackets does not load fixtures. Posts persist in the shared `post` table, authors come from signed-in accounts, and the events panel uses sourced public snapshots. Posts are publicly readable while the author's profile is public. Private contacts, resumes and transcripts are not exposed through posts; course/experience details appear only when explicitly shared. See [community contracts and checks](../docs/community.md). Geographic maps and alumni-history integration remain pending.

## Credits

- Honeycomb: "Honeycomb" by Poly by Google, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), via [Poly Pizza](https://poly.pizza/m/6Mqdrv1n3Oo), stored under `thermal/models/`.
- Hexagonal lattice: adapted from [prisoner849's fiddle](https://jsfiddle.net/prisoner849/jzLdcemb/).
