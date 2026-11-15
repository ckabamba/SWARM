# WarmPath prototypes

The current browser prototype is [Thermal](thermal/index.html). It demonstrates the existing path, people/Ask, and alum reply flow, plus [Social Jackets](thermal/index.html#/community), the student-focused WarmPath community page.

## Features

- **Thermal paths:** enter a goal, inspect the path map, switch demo students from the “You” node, open people, draft an Ask, and use the `#/reply/{id}` page.
- **Social Jackets:** browse fictional club activities and event fixtures, read a newest-first feed from fictional student demo profiles, open concise demo profile summaries, and compose a text post with an optional linked club or event.
- **Shared visual system:** the Thermal prototype follows the colors, typography, controls, and motion direction in [DESIGN.md](../DESIGN.md).

## Running it

Open [index.html](index.html) in a browser, or serve the repository:

```sh
cd prototypes
python -m http.server 4712
```

Then visit `http://localhost:4712`. Thermal loads libraries from CDNs, so it needs an internet connection. Serve the files over HTTP so the 3D honeycomb model loads; opening Thermal directly from disk uses the simpler stand-in.

Open `thermal/index.html#/community` to start at Social Jackets. On the path page, the top tabs move between Paths and Social Jackets. The “You” node in the path map still switches between the two demo students. Ask acceptance uses local storage to synchronize browser tabs; it is not multi-device persistence.

## Demo data and limits

[shared/fake-api.js](shared/fake-api.js) contains invented path profiles and event placeholders shaped like the existing path API draft in [docs/mvp.md](../docs/mvp.md#api-contract). Social Jackets reuses stable fixture IDs for linked clubs and events. Community profiles, posts, and event details are fictional student demo data; posts created in the composer remain in the current page session and are not shared or synced.

Events are invented placeholders, not real listings, and profile summaries are not real accounts or visibility settings. Event and linked-record actions open local fixture details. Geographic map and discovery destinations are not wired in this prototype. Social Jackets does not include alumni in this phase.

The typed goal still resolves to the one seeded NVIDIA example. Production persistence, community APIs, geographic maps, voice interaction, alumni integration, and mobile delivery are not implemented by this browser prototype.

## Credits

- Honeycomb model in Thermal: “Honeycomb” by Poly by Google, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), via [Poly Pizza](https://poly.pizza/m/6Mqdrv1n3Oo). Stored at [thermal/models/honeycomb.glb](thermal/models/honeycomb.glb).
- Hexagonal lattice in Thermal: adapted from [prisoner849's fiddle](https://jsfiddle.net/prisoner849/jzLdcemb/).
