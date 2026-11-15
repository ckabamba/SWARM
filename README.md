# SWARM: WarmPath

WarmPath is a software service for Georgia Tech students and alumni that connects campus resources, communities, and opportunities. It combines a path map accessible through text and voice, a community feed for posts and club events, and interactive geographic maps of campus activities and alumni cities. Web and mobile implementations are part of the product scope.

The project began with the Georgia Tech SGA hackathon prompt on connecting students with alumni. The original alumni-path demo is one part of this broader service.

## Current status

Planning and interactive design prototypes. Three browser prototypes exist under [prototypes/](prototypes/README.md), with a shared fake API, invented people, and placeholder events. They demonstrate the original path, people, and Ask flow; every typed goal currently resolves to the same NVIDIA example. Ask acceptance synchronizes browser tabs through local storage, not separate devices.

The production backend, database, community feed, geographic maps, voice interaction, and mobile application are not implemented yet. [DESIGN.md](DESIGN.md) defines the visual direction derived from the Thermal prototype.

## Three core experiences

| Area | Experience |
| --- | --- |
| Paths and resource discovery | Explore goals and connect resources across campus: clubs, courses, services, events, and alumni. Use text and voice to access these resources, with alumni paths, shared ties, and drafted outreach as part of the experience. |
| Community | A separate page for LinkedIn-style posts by students and alumni, with a prominent section highlighting club activities and events across campus. |
| Interactive maps | A campus view shows club activities and events by physical location. An alumni view shows cities where alumni are based and lets users explore the relevant people. |

The path map describes relationships and possible steps toward a goal. The geographic maps describe places. All three experiences share profiles, clubs, resources, and events, so an event found in discovery or the feed opens the same information on the campus map.

Alumni location means a city shared through a profile, not live tracking. City markers with counts and filters for industry, company, major, or shared clubs are proposed interaction details, not finalized requirements.

Mobile support covers all three experiences. Native, cross-platform, or web-based mobile delivery remains to be decided. Voice access is confirmed scope; speech input, spoken output, and conversational behavior still need an interaction specification. Private messaging, reactions, comments, and follows are undecided.

Campus-map reference supplied by the project owner: [cs2340-project2](https://github.com/jmmachacek/cs2340-project2). Its implementation has not been verified; this is a reference for intended behavior, not an adopted dependency or stack.

## Paths, data, and AI

For the existing alumni-path feature, a goal such as "SWE internship at NVIDIA" identifies alumni who reached that goal. Earlier activities can be ranked by **lift**: the share of achievers who did an activity divided by the share of all alumni who did it. If 40% of NVIDIA interns and 10% of all alumni joined a club, its lift is 4. This is an association, not evidence that the club caused the internship. Display counts and account for small samples.

Lift is specific to alumni-path analysis. Resource discovery, community ordering, and geographic exploration need their own rules. LLM use may include goal understanding, resource discovery, explanations, and drafted asks. Facts, counts, and ranking inputs must come from application data; the model must not invent resources, people, or statistical evidence.

Generated profiles remain useful for development and demos. The service will support real student and alumni profiles and user-authored content, with explicit data sources and profile visibility. LLM failures should leave useful search and browsing available, and voice failures should leave text access available.

## Proposed stack

Hosting is decided: AWS, with PostgreSQL as the database, hosted on Amazon RDS for PostgreSQL. This replaces the earlier Google Cloud decision recorded in [issue #3](https://github.com/ckabamba/SWARM/issues/3). Local development uses the same PostgreSQL major version as RDS.

Within AWS, the working proposal is AWS Amplify Hosting for the web frontend and a containerized FastAPI backend on Amazon ECS Express Mode (Fargate), with the image stored in Amazon ECR. AWS App Runner is not an option because it closed to new customers on April 30, 2026. These service and framework choices stay proposals until the owning roles confirm them in issue #3; the remaining rows below are likewise proposals, not an implemented or finalized architecture. Billing ownership, free-plan credit eligibility, and current costs must be verified before provisioning; the backend's load balancer and the database are billed while they run, even when idle.

| Layer | Working proposal | Still to decide |
| --- | --- | --- |
| Web | React, served as a static build from AWS Amplify Hosting; React Flow for the path graph | Navigation and integration across the three experiences |
| Backend | FastAPI in a container on Amazon ECS Express Mode (Fargate) | Shared service interfaces; confirmation of FastAPI over Django by role 2 |
| Database | PostgreSQL on Amazon RDS (decided); PostGIS for campus places and alumni cities | Schema for the expanded service; whether pgvector is needed for resource matching (#14) |
| AI and voice | Provider-backed language and speech capabilities | Provider, models, speech behavior, and fallbacks |
| Geographic maps | Campus and alumni-city views | Map provider and library |
| Mobile | All three experiences using the shared backend | Native, cross-platform, or web-based approach |
| Deployment | AWS (decided): Amplify Hosting for the web frontend, ECS Express Mode (Fargate) with ECR for the backend, RDS for PostgreSQL for the database, and AWS Secrets Manager for credentials | Confirmation of these services; shared account and billing owner, region, IAM access, and environment setup; mobile distribution after its delivery decision |

## Build order

Keep a working, demonstrable build at each milestone. The full product scope above is distinct from the proposed release sequence below.

1. **Shared foundation:** agree on accounts/profiles, clubs, resources, events, locations, API contracts, and development fixtures.
2. **Connected experiences:** build usable paths/resource discovery, community posting with event highlights, a campus activity map, and an alumni-city map against shared records.
3. **Text and voice:** connect both interaction modes to discovery; define spoken responses and graceful failure behavior.
4. **Mobile implementation:** deliver all three experiences on mobile, planning responsive layouts and touch interactions from the start.
5. **Integration and release:** verify cross-experience navigation, persistence, deployment, and the web/mobile flows.

The proposed initial-release acceptance criteria and open decisions are in [docs/mvp.md](docs/mvp.md). Deferring work to a milestone does not prohibit it from the product.

## Implementation issues

The issue tracker follows the expanded scope. Checklists distinguish completed planning from pending implementation; these links do not imply the features are built.

| Workstream | Issues |
| --- | --- |
| Decisions and team | [Stack/contracts #3](https://github.com/ckabamba/SWARM/issues/3), [remaining role owners #4](https://github.com/ckabamba/SWARM/issues/4), [map decisions #13](https://github.com/ckabamba/SWARM/issues/13), [resource sources/matching #14](https://github.com/ckabamba/SWARM/issues/14) |
| Data and events | [Schema #5](https://github.com/ckabamba/SWARM/issues/5), [fixtures #6](https://github.com/ckabamba/SWARM/issues/6), [path engine #7](https://github.com/ckabamba/SWARM/issues/7), [sourced campus events #12](https://github.com/ckabamba/SWARM/issues/12) |
| Existing path flow | [Path/Ask API #8](https://github.com/ckabamba/SWARM/issues/8), [path UI #10](https://github.com/ckabamba/SWARM/issues/10), [people/Ask integration #11](https://github.com/ckabamba/SWARM/issues/11) |
| Community and accounts | [Posts and event highlights #15](https://github.com/ckabamba/SWARM/issues/15), [identity/profiles #16](https://github.com/ckabamba/SWARM/issues/16) |
| Geographic maps | [Campus activities #17](https://github.com/ckabamba/SWARM/issues/17), [alumni cities #18](https://github.com/ckabamba/SWARM/issues/18) |
| Text and voice | [Resource discovery #19](https://github.com/ckabamba/SWARM/issues/19) |
| Shared delivery | [Client shell/theme #9](https://github.com/ckabamba/SWARM/issues/9), [mobile integration #20](https://github.com/ckabamba/SWARM/issues/20), [deployment and release checks #21](https://github.com/ckabamba/SWARM/issues/21) |

The resource-model decisions in #14 remain dependencies for affected schema, fixture, and engine work in #5–#7. Role 2 coordinates API contracts with the other owners; each feature issue records its UI/data/backend handoffs.

## Team

Five roles cover the expanded service. Christofort and Alfred Tang are confirmed; the other teammates' names remain TBA.

| # | Role | Responsibility | Done when | Owner |
| --- | --- | --- | --- | --- |
| 1 | Data, discovery engine, and event sources | Shared schema and migrations, development fixtures, path statistics and people ranking, resource/event ingestion and matching, normalized campus locations and alumni cities | The backend can query consistent records, ranked paths/people, and locations; imported events retain their sources | TBA |
| 2 | Backend and LLM | Shared API contracts, account/access logic, persistence, resource search orchestration, LLM and speech integration, fallbacks, and deployment | All experiences use a deployed API; posts and asks persist; discovery supports the agreed text/voice behavior and failure cases | Christofort Kabamba |
| 3 | Paths, resource discovery, and alumni connections | Path graph, resource search/results, text/voice controls, people panel, shared ties, and Ask/reply flow on web and mobile | Users discover a resource or path, inspect an alum, and send/accept an ask across devices using accessible desktop and mobile interfaces | Alfred Tang |
| 4 | Community, profiles, and shared app design | Post composer/feed, club/event highlights and posting forms, account/profile screens, shared navigation and components, visual design, and mobile app integration | Users create posts and browse highlights; profiles and navigation work across all experiences; the shared shell supports the chosen mobile delivery approach | TBA |
| 5 | Geographic maps and demo coordination | Interactive campus activity map, alumni-city map, location details and agreed filters, web/mobile map interactions, demo script and pitch coordination | Users explore campus activities and alumni cities and open shared records on web and mobile; the team can demonstrate the integrated service | TBA |

Roles 3, 4, and 5 each implement and verify their own features on web and mobile. Role 4 coordinates shared navigation, design, and mobile integration; it does not build every mobile feature. Role 1 supplies event/location data, role 2 exposes it, and roles 3–5 present it in their respective experiences. Role 5 coordinates the demo, with each owner supplying and verifying their part.

These assignments replace the earlier path-only division of work. The mobile framework remains undecided; role 4 coordinates that decision with the team. See [folder ownership and handoffs](docs/mvp.md#repo-layout) for boundaries.

## Working in this repo

Nobody pushes to `main`, human or agent. Every change goes on a branch and reaches `main` through a pull request; a human teammate merges it.

```sh
git switch main
git pull
git switch -c <area>/<short-topic>
# make and verify small changes
git push -u origin <area>/<short-topic>
# open a pull request into main
```

Coding agents must read [AGENTS.md](AGENTS.md) before changing anything.

## Docs

- [docs/mvp.md](docs/mvp.md): proposed initial release, existing draft API, and expanded data/API needs.
- [docs/alumni-path-map.md](docs/alumni-path-map.md): original path-map rationale, scoped to that feature and updated to link to the broader vision.
- [DESIGN.md](DESIGN.md): shared visual language and layouts for web and mobile.
- [AGENTS.md](AGENTS.md): engineering workflow and agent guidance aligned with the product scope.
- [prototypes/README.md](prototypes/README.md): how to run the existing design prototypes and their limitations.
