# Thermal UI and design prototypes

Thermal is the main UI and now connects to a local FastAPI/PostgreSQL resource service. It uses real source-linked campus resources and public event snapshots, with persistent browser-workspace saves. Transit and Engineering Pad remain fixture-based design prototypes of the original goal/path/people/ask flow. See the [local testing guide](../docs/backend-local-testing.md) for Thermal's backend command.

| Direction | Look | Motion | Built with |
| --- | --- | --- | --- |
| [Thermal](thermal/index.html) | Near-black and Georgia Tech gold: one strand per alum who reached the goal, over a honeycomb whose cells fill by how many strands cross them | High: WebGL particles, routes that draw themselves | React, react-three-fiber, ShaderGradient, loaded from a CDN |
| [Transit](transit/index.html) | Yellow ground, black transit lines, one line per activity type | Medium: lines draw on, riders move, the next-stop flag slides | Plain SVG and the Web Animations API |
| [Engineering pad](pad/index.html) | Green grid paper, a worked Given / Find / Solution problem | Low: press feedback and 200ms reveals | HTML and CSS, a little script |

![Thermal](shots/thermal.jpg)
![Transit](shots/transit.jpg)
![Engineering pad](shots/pad.jpg)

## Running them

**Connected Thermal:** run `.\.venv\Scripts\python.exe -m backend.manage run` from the repository root and open `http://127.0.0.1:8000/thermal/`. Its backend must run; a static server alone is insufficient. The instructions below apply to the other prototypes.

Open [index.html](index.html) in a browser, or serve the folder:

```
cd prototypes
python -m http.server 4712
```

Then visit `http://localhost:4712`. Thermal needs an internet connection for its libraries, and it has to be served like this for its 3D honeycomb model to load; opened straight from disk it shows a simpler stand-in. The prototypes are laid out for a laptop screen; the alum reply page (`#/reply/5` on any of them) is the one screen sized for a phone.

The port-4712 server is for fixture prototypes only. Thermal's connected UI uses port 8000.

To try the current two-tab simulation, send an ask from the people panel, follow its "open the reply page" link into a second tab in the same browser profile, and accept there. The first tab updates through local storage. This does not demonstrate two-device persistence; that requires the planned backend.

## Data

[shared/fake-api.js](shared/fake-api.js) holds invented data for Transit and Engineering Pad. Thermal no longer loads it: [thermal/api.js](thermal/api.js) calls the local backend. Its catalog and event metadata retain public sources; alumni/Ask functionality waits for authorized histories and accounts.

One field is not in the contract: each stop carries `typical_year`. All three maps need some way to place a stop left to right, and lift alone does not give one. If the team wants any of these layouts, the path engine would need to return something like it (the median `school_year` from PersonActivity would do), and the contract in `docs/mvp.md` would change with it.

Transit and Engineering Pad still resolve every goal to their seeded NVIDIA path. Thermal performs real resource matching and shows an explicit no-match state.

## Credits

- Honeycomb model in Thermal: "Honeycomb" by Poly by Google, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), via [Poly Pizza](https://poly.pizza/m/6Mqdrv1n3Oo). Stored at [thermal/models/honeycomb.glb](thermal/models/honeycomb.glb).
- Hexagonal lattice in Thermal: adapted from [prisoner849's fiddle](https://jsfiddle.net/prisoner849/jzLdcemb/).
