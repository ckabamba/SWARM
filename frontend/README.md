# WarmPath frontend

The React app for WarmPath, built with Vite. It holds the path experience ported from the Thermal prototype in [prototypes/thermal/index.html](../prototypes/thermal/index.html) (landing page, path map, people panel, alum reply page) and the Social Jackets community page. Read [DESIGN.md](../DESIGN.md) before changing any screen.

Social Jackets here has moved on from the version in the prototype: it is a scrolling three-column page behind a shared top bar. The prototype file was not changed.

## Run it

Vite 6 needs Node 18, 20, or 22 and newer. This was checked on Node 22.

```sh
cd frontend
npm install
npm run dev       # dev server, http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

`node_modules/` and `dist/` are ignored by git.

## Using the backend

By default the app runs on fixtures and needs no backend. To read real data, run both servers:

```powershell
# terminal 1, from the repo root: FastAPI on http://127.0.0.1:8000
.\.venv\Scripts\python.exe -m backend.manage run

# terminal 2
cd frontend
copy .env.example .env      # then set VITE_DATA_SOURCE=api
npm run dev
```

First-time backend setup (Python environment, Docker/existing PostgreSQL, migrations and event import) is in [Running WarmPath after cloning](../docs/running-warmpath.md). Root `.env` configures the database; `frontend/.env` only selects this client's data mode. Ordinary users will use a hosted application URL, not these development commands.

How it fits together:

- The dev server proxies `/api` to `http://127.0.0.1:8000` (see `vite.config.js`). Open the app at `localhost` or `127.0.0.1`; the backend rejects any other host name.
- [src/shared/api.js](src/shared/api.js) is the HTTP client. It covers session, resources, events, jobs, posts, accounts, profiles and resume import, has a 12-second timeout, and throws on any failure.
- [src/shared/data-source.js](src/shared/data-source.js) reads `VITE_DATA_SOURCE`. In `api` mode a call that fails never falls back to fixtures: the list stays empty, the line under the stream says it could not be loaded, and a `[WarmPath]` warning is logged in the console.
- Social Jackets reads its feed from `GET /api/posts` and its events from `GET /api/events`; [src/community/data.js](src/community/data.js) adapts both to the shapes the components already use. In `api` mode no invented clubs, people, posts or events are shown. In both modes the page reads events again every five minutes and when the tab is shown again (`watchEvents`); a failed re-read keeps the listings already on screen. In fixture mode the events are the real public listings when a backend serves the page, and none otherwise.
- Accounts work in `api` mode. The account button opens a drawer ([src/shared/AccountPanel.jsx](src/shared/AccountPanel.jsx)) to sign in or create an account, edit the profile, and optionally import a resume. The state lives in [src/shared/account.js](src/shared/account.js). Passwords need 12 characters or more, and a profile starts private.
- The composer posts through `POST /api/posts` once you are signed in and your profile is public. A post can link to a listed event or a campus resource.
- Still on fixtures in every mode: the path map, the people panel, asks and the reply page, plus Social Jackets clubs. The backend's `POST /api/path` returns resources, not alumni stops, and `/api/people` and asks are not available yet. The account menu keeps a "Path map demo student" switch for that reason.
- Not built yet: editing or deleting a post, editing contacts and experiences by hand (a resume import can add them), courses and transcripts, deleting an account, and posting an event (the backend has no endpoint for it).
- `npm run build` output has no proxy. Serving it needs the API on the same origin.

## The fixtures

In fixture mode nothing talks to a backend. [src/shared/fake-api.js](src/shared/fake-api.js) is a copy of [prototypes/shared/fake-api.js](../prototypes/shared/fake-api.js) turned into an ES module. Every person in it is invented and the events are placeholders, not real listings. Every typed goal resolves to the same NVIDIA example.

Its functions return the JSON shapes drafted in [docs/mvp.md](../docs/mvp.md#api-contract), with one exception: stops carry `typical_year`, which is not in the contract. It is flagged where it is set and is still an open contract gap.

Asks are kept in the browser's local storage. Accepting an ask on the reply page updates other tabs in the same browser, not other devices.

Social Jackets data is in [src/community/data.js](src/community/data.js). Its profiles are the two demo students, and its clubs and events are the path fixture's records under stable ids (`club:5`, `event:42`). In `api` mode the posts and events come from the backend instead, and the fixture clubs are not listed. A post written in the composer stays in the open tab and is gone after a reload.

## Layout

Folders follow the ownership table in [docs/mvp.md](../docs/mvp.md#repo-layout).

| Path | Holds |
| --- | --- |
| `src/app/` | App entry and routing. Routing is the prototype's hash routing: `#/community` opens Social Jackets, `#/reply/<id>` opens the reply page, anything else opens the path experience. The app also holds the current demo student, so every page shows the same person. |
| `src/map/` | Path map: layout maths, the WebGL lattice and strands, the 3D honeycomb, checkpoints, and the landing and map screen. |
| `src/people/` | People panel with drafted asks, and the alum reply page. |
| `src/community/` | Social Jackets: profile card, composer, posts, events and clubs, the details drawer, and its fixtures. |
| `src/shared/` | Fake API, the backend client and the data-source switch, backdrop, the top bar with search and the account menu, the theme, icons, small shared controls, and the reduced-motion flag. |
| `src/app.css` | The prototype's stylesheet, unchanged. |
| `src/shared/shell.css` | Theme tokens and the top bar. It loads after `app.css` and restates the few prototype rules that had a fixed colour. |
| `public/models/` | `honeycomb.glb`: "Honeycomb" by Poly by Google, CC BY 3.0, <https://poly.pizza/m/6Mqdrv1n3Oo>. |

Dependency versions are pinned to the ones the prototype loads from its CDN. The prototype's Social Jackets also loads Lenis for smooth scrolling; this app scrolls natively and does not add it.

## Themes

The account button in the top bar opens a menu with the demo student and a Dark / Light switch. The choice is saved in local storage under `warmpath.theme` and applies to every page. Dark is the look described in DESIGN.md. Light is gold, navy and white; its tokens are in `src/shared/shell.css` and are not in DESIGN.md yet.
