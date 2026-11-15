# WarmPath frontend

The React app for WarmPath, built with Vite. Right now it is a faithful port of the Thermal prototype in [prototypes/thermal/index.html](../prototypes/thermal/index.html): the landing page, the path map, the people panel and the alum reply page. Read [DESIGN.md](../DESIGN.md) before changing any screen.

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

## Layout

Folders follow the ownership table in [docs/mvp.md](../docs/mvp.md#repo-layout).

| Path | Holds |
| --- | --- |
| `src/app/` | App entry and routing. Routing is the prototype's hash routing: `#/reply/<id>` opens the reply page, anything else opens the path experience. |
| `src/map/` | Path map: layout maths, the WebGL lattice and strands, the 3D honeycomb, checkpoints, and the landing and map screen. |
| `src/people/` | People panel with drafted asks, and the alum reply page. |
| `src/shared/` | Fake API, backdrop, small shared controls, and the reduced-motion flag. |
| `src/app.css` | The prototype's stylesheet, unchanged. |
| `public/models/` | `honeycomb.glb`: "Honeycomb" by Poly by Google, CC BY 3.0, <https://poly.pizza/m/6Mqdrv1n3Oo>. |

Dependency versions are pinned to the ones the prototype loads from its CDN.
