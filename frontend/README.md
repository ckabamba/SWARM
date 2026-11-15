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

## The data is a development fixture

Nothing here talks to a backend yet. [src/shared/fake-api.js](src/shared/fake-api.js) is a copy of [prototypes/shared/fake-api.js](../prototypes/shared/fake-api.js) turned into an ES module. Every person in it is invented and the events are placeholders, not real listings. Every typed goal resolves to the same NVIDIA example.

Its functions return the JSON shapes drafted in [docs/mvp.md](../docs/mvp.md#api-contract), with one exception: stops carry `typical_year`, which is not in the contract. It is flagged where it is set and is still an open contract gap.

Asks are kept in the browser's local storage. Accepting an ask on the reply page updates other tabs in the same browser, not other devices.

Social Jackets data is in [src/community/data.js](src/community/data.js). Its profiles are the two demo students, and its clubs and events are the path fixture's records under stable ids (`club:5`, `event:42`). A post written in the composer stays in the open tab and is gone after a reload.

## Layout

Folders follow the ownership table in [docs/mvp.md](../docs/mvp.md#repo-layout).

| Path | Holds |
| --- | --- |
| `src/app/` | App entry and routing. Routing is the prototype's hash routing: `#/community` opens Social Jackets, `#/reply/<id>` opens the reply page, anything else opens the path experience. The app also holds the current demo student, so every page shows the same person. |
| `src/map/` | Path map: layout maths, the WebGL lattice and strands, the 3D honeycomb, checkpoints, and the landing and map screen. |
| `src/people/` | People panel with drafted asks, and the alum reply page. |
| `src/community/` | Social Jackets: profile card, composer, posts, events and clubs, the details drawer, and its fixtures. |
| `src/shared/` | Fake API, backdrop, the top bar with search and the account menu, the theme, icons, small shared controls, and the reduced-motion flag. |
| `src/app.css` | The prototype's stylesheet, unchanged. |
| `src/shared/shell.css` | Theme tokens and the top bar. It loads after `app.css` and restates the few prototype rules that had a fixed colour. |
| `public/models/` | `honeycomb.glb`: "Honeycomb" by Poly by Google, CC BY 3.0, <https://poly.pizza/m/6Mqdrv1n3Oo>. |

Dependency versions are pinned to the ones the prototype loads from its CDN. The prototype's Social Jackets also loads Lenis for smooth scrolling; this app scrolls natively and does not add it.

## Themes

The account button in the top bar opens a menu with the demo student and a Dark / Light switch. The choice is saved in local storage under `warmpath.theme` and applies to every page. Dark is the look described in DESIGN.md. Light is gold, navy and white; its tokens are in `src/shared/shell.css` and are not in DESIGN.md yet.
