# Agent guide

Rules for coding agents (Claude Code, Cursor, Copilot, Codex and others) working in this repo. Human teammates follow the same git workflow.

Before writing code, read [README.md](README.md) for the current product scope and [docs/mvp.md](docs/mvp.md) for the proposed release and API contracts. [docs/alumni-path-map.md](docs/alumni-path-map.md) explains the original path feature; it does not define the whole product. Distinguish confirmed scope from proposed implementation details and open decisions. Before any front-end work, also read [DESIGN.md](DESIGN.md), which sets the visual theme.

## Git workflow

1. Never commit or push to `main`. All work reaches `main` through a pull request.
2. Start from current `main`: `git switch main`, `git pull`, then `git switch -c <area>/<short-topic>`. Examples: `engine/lift-query`, `map/goal-box`, `events/engage-parser`.
3. Keep one topic per branch and make small commits whose messages say what changed.
4. Before pushing, bring current `main` into the branch and run what you changed.
5. Push the branch with `git push -u origin <branch>` and open a pull request into `main`. Use `gh pr create` if it is installed. If it is not, give your human the compare link that `git push` prints.
6. Do not merge the pull request. A human teammate merges it.
7. Never force-push, never rewrite history on a branch someone else uses, and never delete a branch you did not create.

In the pull request description, say what changed, how you checked it, and what is not done or not tested.

## Stay in your lane

The five roles and their folder ownership are defined in [README.md](README.md#team) and [docs/mvp.md](docs/mvp.md#repo-layout):

1. **Data, discovery engine, and event sources:** schema/migrations, fixtures, path/ranking queries, ingestion, and normalized locations.
2. **Backend and LLM — Christofort Kabamba:** shared APIs, account/access logic, persistence, search orchestration, AI/speech integrations, and backend deployment.
3. **Paths, resource discovery, and alumni connections:** path/discovery interfaces, text/voice controls, people, and Ask/reply flows.
4. **Community, profiles, and shared app design:** feed/posts, club/event highlights and forms, account/profile UI, shared design/navigation, and mobile integration.
5. **Geographic maps and demo coordination:** campus and alumni-city map interfaces, location details, and integrated demo/pitch coordination.

Roles 3–5 each own their feature's web and mobile implementation. Role 4 coordinates the shared client shell and mobile delivery; role 1 supplies event/location data and role 2 serves it. Concrete mobile paths depend on the chosen delivery approach. Follow the spec's handoffs rather than assigning all mobile work to one person or returning event ingestion to the old role 5 boundary.

Edit within the assigned role or the user's explicitly authorized task scope; coordinate changes across other owners' folders, including shared frontend routes/components owned by role 4. Coordinate schema changes with role 1. Three teammate names remain TBA for roles 1, 3, and 5; role 4 is owned by Shehryar Sardar. Documentation is shared and may be updated together to keep product guidance consistent.

## The API contract

The existing draft JSON shapes in [docs/mvp.md](docs/mvp.md#api-contract) support the original path prototype; they are not a complete contract for the expanded service. Specify new endpoint shapes before consumers build against them, and reuse profile, club, resource, and event identifiers across web, mobile, discovery, community, and maps. Do not change a shape silently. If one has to change, update `docs/mvp.md` in the same pull request and say so at the top of the description.

## Product rules

- **Support the three core experiences:** paths and resource discovery through text and voice; a community feed with student/alumni posts and club/event highlights; and interactive geographic maps for campus activities and alumni cities.
- **Web and mobile are product scope.** Plan layouts, navigation, and shared APIs for both. The mobile delivery technology remains undecided.
- **AI helps users access real resources.** Goal understanding, resource discovery, explanations, and drafted asks are supported uses. Ground factual responses in application data. Compute counts and statistical scores in application/database logic, not by asking a model to invent them.
- **Use scoring appropriate to the feature.** Lift remains the proposed alumni-path association measure, with counts and minimum sample support. It is not a universal filter for campus resources, community posts, or map locations.
- **Show evidence accurately.** Say "9 of 14 did this" without claiming it caused the outcome. Do not present generated fixtures as real alumni evidence.
- **Support real users and explicit data sources.** Seeded people are development/demo fixtures. Real student/alumni profiles and authored posts are part of the service. Define permissions and visibility for profile data and any imports; expanded scope is not blanket authorization to scrape personal data. Alumni map locations are shared cities, not live positions.
- **Keep each milestone demonstrable.** Preserve working behavior as the service grows. The roadmap sets delivery order, not permanent feature bans.
- **Respect confirmed scope and open decisions.** Accounts, community content, geographic discovery, and mobile are no longer excluded. Private messaging, reactions, comments, follows, exact voice behavior, and delivery technologies remain undecided; do not silently treat them as requirements.

## Code rules

- Keep secrets out of the repo. API keys go in `.env`, which is ignored by git, and their names go in `.env.example`.
- Every LLM or speech integration needs the graceful failure behavior described in [docs/mvp.md](docs/mvp.md#llm-use). Missing AI access must leave useful search/browsing available; unavailable voice must leave text access available.
- Make the smallest change that does the job. Do not add a dependency, framework or abstraction the task does not need, and ask your human before adding a large one.
- Run your change before opening the pull request, and report honestly what you ran and what you did not.
- WarmPath is the product name and SWARM is the repo name. Use WarmPath in anything a user sees.
