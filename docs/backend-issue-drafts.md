# Backend issue drafts

**Local drafts only.** B01–B14 are planning identifiers, not GitHub issue numbers. No issues have been created or edited remotely for this design pass. Design rationale and proposed contracts are in [backend-design.md](backend-design.md).

Proposed assignee for every backend issue: **Christofort Kabamba (@ckabamba)**. Existing issues remain the feature-level trackers; these drafts split out backend implementation and link to those parents. UI and schema work stays with its current owner. When publication is requested, check the live backlog for duplicates, create only missing work, and add child links to the existing parents. Do not close parents until their UI/data/backend acceptance criteria are met.

Current constraints: **$100 total AWS budget** and **Thermal as the main UI**. Run routine development/tests locally; use short, costed cloud windows. Integrate `prototypes/thermal/index.html` first; the other clients remain prototypes for now. The [testing guide](backend-local-testing.md) describes the implemented local slice and its checks.

Implementation update: the local Thermal slice now uses FastAPI/PostgreSQL, real source-linked resources, public Engage/calendar snapshots, and persisted browser-workspace saves. This advances parts of B02/B03, event reads supporting B08/B09, and B13, but does not complete those issues. The user requires real data and has no existing alumni dataset; B06/B07 need authorized histories and accounts before their UI can be enabled. Public event listings do not establish alumni trajectories. See the testing guide for implemented checks; the remaining checklists below are roadmap work, not completed acceptance claims.

## B01 — Agree on backend decisions and shared API contracts

Parent: [#3](https://github.com/ckabamba/SWARM/issues/3). Collaborators: role 1 and UI owners, including Alfred Tang for discovery. Start now; resolve #13/#14 only for affected contracts.

Produce the decision log and concrete request/response examples for the design's endpoint matrix. Record FastAPI versus Django, identity/session approach, ID types, permissions, error format, pagination, voice behavior, and which AWS choices are confirmed. Distinguish contract agreement from implementation.

- [ ] Resolve student year, stop typical year, complete Ask fields, server timestamps, and goal no-match behavior.
- [ ] Define actor/visibility matrix, event-publisher permissions, list limits, and map filtering/count semantics.
- [ ] Update `docs/mvp.md` alongside agreed examples; document compatibility with browser and Expo models.
- [ ] Record remaining decisions with owners and the exact tasks they block.
- [ ] Agree on Python/runtime compatibility, validation, database driver/transaction and migration tooling; make Thermal the initial consumer and record the $100 total constraint.

Verification: walk through one happy and one failure response per capability with its UI/data owner. No silent contract changes.

## B02 — Scaffold the API with configuration and health checks

Parents: [#8](https://github.com/ckabamba/SWARM/issues/8), [#21](https://github.com/ckabamba/SWARM/issues/21). Depends on B01 framework decision; can start before feature schemas.

Create the minimal application under the agreed backend layout with feature routers, validated environment configuration, shared errors, request IDs, and health/readiness endpoints.

- [ ] Document install/run commands and non-secret `.env.example` values.
- [ ] Generate the agreed API schema and configure explicit development web origins.
- [ ] Keep process health independent of AI; readiness reports database availability without credentials.
- [ ] Establish local verification commands and CI checks for implemented backend behavior.
- [ ] Document the actual API start command and interactive API docs URL; allow Thermal's explicit local origin without exposing credentials in client code.

Verification: clean start, invalid configuration fails clearly, process health succeeds, database outage makes readiness fail, and errors carry request IDs.

## B03 — Integrate PostgreSQL, migrations, and data-owner interfaces

Parents: [#5](https://github.com/ckabamba/SWARM/issues/5), [#6](https://github.com/ckabamba/SWARM/issues/6), [#8](https://github.com/ckabamba/SWARM/issues/8). Depends on B02 and role 1's agreed schema/fixture slice. #14 still blocks affected resource modeling.

Connect the API to role 1's schema and queries, with one agreed connection/session and transaction pattern. Role 1 retains migration and seed ownership.

- [ ] Pin the agreed PostgreSQL major version for local use and RDS planning.
- [ ] Document migration/seed ordering and fixture versus real-data environments.
- [ ] Agree on callable path/people/resource query inputs, outputs, errors, and visibility context.
- [ ] Avoid duplicate ORM/schema definitions and concurrent migrations at app-worker startup.
- [ ] Provide a local PostgreSQL setup and separate test database; preserve development data across restarts. Verify Docker availability before depending on Compose.

Verification: fresh database setup, fixture read through the API, committed write survives restart, failed transaction rolls back, and seed rerun behavior is documented.

## B04 — Enforce identity, profile ownership, and city sharing

Implemented locally: password accounts, owner-scoped profile CRUD, field visibility, expiring PDF/DOCX/text drafts, reviewed imports and catalog-linked topic matches. See [profiles and resumes](profiles-and-resumes.md). This advances B03/B04/B13 but does not complete production identity/recovery, GT verification, maps or Expo integration. No remote issue changes were made.

Parent: [#16](https://github.com/ckabamba/SWARM/issues/16). Depends on B01 identity/visibility decisions, B03, and account/profile schema. Collaborator: role 4.

Integrate the selected identity provider and map validated identities to local accounts. Implement agreed profile reads/edits, including normalized city selection and explicit sharing preferences.

- [ ] Validate credentials and derive the actor server-side; separate demo identity selection from connected mode.
- [ ] Prevent another user editing a profile or changing privileged roles through profile fields.
- [ ] Specify allowed public/member profile fields and enforce them consistently.
- [ ] Persist city opt-in/withdrawal for map queries; document web/mobile session and logout behavior.

Verification: missing/invalid identity, cross-user edit, field escalation, allowed own edit, and sharing withdrawal. Coordinate login/profile UI with role 4.

## B05 — Persist student progress and active goals

Parents: [#8](https://github.com/ckabamba/SWARM/issues/8), [#16](https://github.com/ckabamba/SWARM/issues/16), [#20](https://github.com/ckabamba/SWARM/issues/20). Depends on B04 and role 1's participation/goal schema.

Expose the agreed own-profile activity and active-goal operations so the mobile lit-hex and goal controls can persist across devices.

- [ ] Use explicit set/remove operations rather than a retry-sensitive toggle.
- [ ] Validate referenced activities/goals and prevent duplicate participation records.
- [ ] Define concurrent-update behavior and return server state for reconciliation.
- [ ] Reuse role 1's path personalization; client preferences remain local unless separately specified.

Verification: repeated set/remove, unknown activity, denied cross-user write, and reload from another authenticated client. A failed write must not appear as persisted success.

## B06 — Serve path evidence and ranked people from shared queries

Parents: [#7](https://github.com/ckabamba/SWARM/issues/7), [#8](https://github.com/ckabamba/SWARM/issues/8). Depends on B03/B04, agreed path contracts, and role 1's engine/fixtures; honor #14's affected-query dependencies. Collaborator: role 3.

Implement path and people HTTP adapters around role 1's engine. Start with known goals and deterministic resolution; B11 adds model-assisted interpretation.

- [ ] Return validated goal matches, evidence counts, lift, student progress, shared ties, and shared event IDs.
- [ ] Preserve minimum-support and ranking rules from the engine; never compute scores in a prompt.
- [ ] Specify empty/ambiguous/insufficient-evidence results and visible-person filtering.
- [ ] Resolve current student and typical-year shape gaps through B01 contracts.

Verification: common-activity fixture drops out of the path but remains discoverable, sparse goal is explicit, unknown text does not become the demo goal, and two students have appropriate progress/people results.

## B07 — Persist asks with participant permissions and safe retries

Parent: [#8](https://github.com/ckabamba/SWARM/issues/8); consumer [#11](https://github.com/ckabamba/SWARM/issues/11). Depends on B04/B06 and Ask schema. Collaborator: role 3.

Implement create/detail/accept plus paginated sent/received lists. Draft generation is separate from sending.

- [ ] Set sender from identity; validate recipient, goal, message limits, and agreed contact eligibility.
- [ ] Return canonical server IDs, timestamps, complete Ask fields, and reply-page URL.
- [ ] Restrict detail/list access to participants and acceptance to the recipient; URL IDs confer no permission.
- [ ] Make acceptance repeatable and create retries idempotent using a transactionally stored key/result with documented retention and payload conflict behavior.
- [ ] Define only `sent -> accepted`; do not invent ignored/completed transitions or calendar booking.

Verification: two-device acceptance, unrelated-user denial, repeated/concurrent requests, different-payload key reuse, and persistence after restart.

## B08 — Serve community posts and shared event highlights

Parents: [#15](https://github.com/ckabamba/SWARM/issues/15), [#12](https://github.com/ckabamba/SWARM/issues/12). Depends on B04 and role 1's post/club/event schema and sources. Collaborator: role 4.

Implement agreed text post creation/list/detail and author edit/delete controls, plus sourced upcoming event reads and permitted event publishing.

- [ ] Derive author from identity; validate content limits and linked club/event/resource IDs.
- [ ] Use stable chronological cursor pagination and defined deletion behavior.
- [ ] Prevent duplicate post creation on retries and deny edits by other authors.
- [ ] Serve event highlights from shared records with source, time zone, location, and cancellation/expiry behavior.
- [ ] Enforce the agreed event-publisher policy; no reactions/comments/follows/private messaging implied.

Verification: ownership, invalid references, retry, tied timestamps/pagination, and a post's event resolving to the same record as the map.

## B09 — Expose campus places and event map queries

Parent: [#17](https://github.com/ckabamba/SWARM/issues/17). Depends on B03, #13 map contracts, #12 event data, and agreed visibility rules. Collaborators: roles 1/5.

Expose normalized campus places and their event/activity references for the geographic map.

- [ ] Validate bounding boxes, coordinates, and date intervals; define capped results/truncation or pagination.
- [ ] Return place IDs, coordinates, event IDs, sourced details, and time zones.
- [ ] Define missing-coordinate and cancelled/past-event handling; never place missing locations at arbitrary coordinates.
- [ ] Use agreed data-owner queries/indexes; PostGIS is conditional on the decision.

Verification: empty bounds, invalid input, date boundary, missing coordinates, capped results, and identical event detail from map/feed/discovery.

## B10 — Expose alumni cities with consistent visibility

Parent: [#18](https://github.com/ckabamba/SWARM/issues/18). Depends on B04, #13 contracts, and role 1's normalized cities. Collaborator: role 5.

Return shared alumni city markers and paginated visible profiles for a selected city. Confirm counts and filters before implementing them.

- [ ] Use city IDs plus region/country and centroids; do not expose precise personal positions.
- [ ] Apply the same eligibility/visibility predicate before counts and people pagination.
- [ ] Distinguish cities with identical names and handle unshared/unknown cities.
- [ ] Make city-sharing withdrawal effective in both aggregate and detail queries, including any caches.

Verification: hidden alumni contribute neither count nor identity, withdrawal updates both views, same-name cities remain distinct, and filters do not bypass visibility.

## B11 — Add grounded discovery, goal parsing, and ask drafts

Parents: [#19](https://github.com/ckabamba/SWARM/issues/19), [#8](https://github.com/ckabamba/SWARM/issues/8). Depends on B03/B04, #14's search/source model, and B06 for path/ask grounding. Provider-free search can precede provider selection. Collaborators: role 1 and Alfred Tang (role 3).

Implement text discovery over permitted application records, then attach the selected AI provider for structured goal interpretation, explanations, and reviewed ask drafts.

- [ ] Return openable record references, explicit match/clarification/no-match state, and fallback indicators.
- [ ] Validate generated structure/references; preserve SQL counts, scores, and verified shared ties.
- [ ] Treat retrieved text as data and keep generation separate from writes/sending.
- [ ] Bound provider timeouts/usage and retain deterministic search/template drafting without AI configuration.
- [ ] Keep keys server-side and log operational metadata without private prompt content.

Verification: run the design's evaluation set, including hallucinated references, embedded instructions, hidden records, malformed output, and provider timeout; record observed outcomes.

## B12 — Add the agreed speech interaction with text fallback

Parent: [#19](https://github.com/ckabamba/SWARM/issues/19). Depends on B11 and B01 voice/provider decisions. Collaborators: Alfred Tang and mobile integration owner.

Implement the agreed voice slice. Proposed initial flow: push-to-talk, editable transcript, then ordinary discovery. Spoken output requires its own explicit scope decision.

- [ ] Define upload formats/size/duration, authentication, limits, cancellation, and timeout behavior.
- [ ] Keep transcription separate from goal/search processing and use the same result contract as text.
- [ ] Document audio retention; default proposal is transient processing, with no application raw-audio storage.
- [ ] Confirm the selected capture/playback approach works in the current Expo Go environment.
- [ ] Preserve text access on permission denial, speech failure, or optional synthesis failure.

Verification: denied microphone, empty/oversized/unsupported audio, edited transcript, timeout/cancel, and successful spoken-query-to-record journey on target clients.

## B13 — Connect Thermal first, then extend stable contracts to Expo

Parents: [#11](https://github.com/ckabamba/SWARM/issues/11), [#20](https://github.com/ckabamba/SWARM/issues/20), plus feature parents #15/#17/#18/#19. Depends incrementally on B04–B12 as each slice lands. UI owners implement their client changes; Christofort owns API support and integration evidence.

Migrate one working flow at a time in `prototypes/thermal/index.html`, starting with profile/path/ask. Transit, Engineering Pad, and Expo remain prototypes for this first milestone. Keep explicit fixture and connected modes. Extend stable contracts to Expo later without making mobile delivery a prerequisite for the first backend demonstration.

- [ ] Introduce a separate HTTP adapter and convert Thermal's synchronous render-time reads into asynchronous state with loading/error/cancellation and stale-response handling.
- [ ] Replace fake ask subscriptions with bounded visible-view polling/refresh; handle failed writes explicitly.
- [ ] Replace fixed `14`/demo totals with server evidence, validate reply ID routing, and handle missing asks without generating fake records.
- [ ] Replace the connected reply screen's “No account needed” behavior/copy with the agreed recipient authorization flow.
- [ ] Agree on adapters for mobile flattened Ask names, server IDs/timestamps, and authenticated actor selection.
- [ ] Replace local-only persisted goals/progress/asks with authoritative API reads/writes in connected mode.
- [ ] Preserve loading, empty, failure, retry, and success states; no fake write success on network failure.
- [ ] Verify event identity across discovery/community/maps and sharing rules across client types.
- [ ] Record remaining client limitations and align the mobile spec as integrations replace local behavior.

Verification: first demonstrate Thermal in separate sender/recipient browser sessions against local PostgreSQL, including restart persistence and failed requests. Later verify all agreed web/mobile journeys; report those phases separately so the Thermal milestone does not imply mobile completion.

## B14 — Deploy the API incrementally on AWS and verify release recovery

Parent: [#21](https://github.com/ckabamba/SWARM/issues/21). Depends on B02/B03 and #3's AWS account, billing, service, region, and database decisions. Prepare configuration early; provision only for scheduled tests after the local slice and cost worksheet pass. Final acceptance depends on integrated feature slices.

Package the selected API and configure the agreed AWS services with PostgreSQL on RDS. ECR/ECS Express Mode/Fargate remain the working proposal until confirmed.

- [ ] Produce a current, configuration-specific cost worksheet covering all scheduled runtime and retained resources: $50 hosting allocation, $10 supporting storage/services, $40 reserve, $100 total. Do not assume free-tier benefits or credits.
- [ ] Configure project-period budget alerts at $25/$50/$60/$80, daily spend review, capped scaling, short retention, and a named cleanup deadline/owner; acknowledge alerts are not hard caps.
- [ ] Establish a repeatable container build, environment-specific secrets, HTTPS, allowed origins, and restricted database connectivity.
- [ ] Deploy health/readiness plus one database read before expanding to full features.
- [ ] Run migrations explicitly; document release ordering, schema-compatible rollback, database backups, and restore procedure.
- [ ] Collect actionable errors, request latency, provider fallback/usage, and database readiness without private content.
- [ ] Document billing ownership, configured resource costs, and cleanup/runbook steps before provisioning.
- [ ] Demonstrate teardown of disposable resources after preserving needed data; verify remaining storage/IP/log/image costs and account for RDS automatic restart after seven stopped days.
- [ ] Run deployed web/mobile smoke checks, provider-outage behavior, restart persistence, and a recovery exercise in the demo environment.

Verification: record deployment version, checks and recovery evidence; do not mark the parent complete while any feature owner's release criteria remain outstanding.
