# Backend design and delivery plan

Status: roadmap based on repository commit `8643c49`, with a first local implementation now present. [The current Thermal slice](mvp.md#implemented-local-thermal-slice) and [run/test guide](backend-local-testing.md) describe what actually runs. The wider design below remains a proposal. The accompanying [issue drafts](backend-issue-drafts.md) remain local, unpublished drafts.

Backend and LLM owner: **Christofort Kabamba (@ckabamba)**. Role 1 owns schema, migrations, fixtures, ranking queries, and ingestion. Role 2 owns HTTP contracts, access enforcement, transactions, AI/speech orchestration, and backend deployment. Alfred Tang (@Randemperson) has claimed the role 3 discovery UI work in [#19](https://github.com/ckabamba/SWARM/issues/19#issuecomment-6887622641); coordinate text/voice interaction and result states with him. Roles 4 and 5 consume the same service for community/profiles and geographic maps.

## Starting point

Update after pulling `19ef2fa`: [local accounts, profiles and reviewed resume imports](profiles-and-resumes.md) extend the shared Alembic/person foundation. This supersedes descriptions below of all accounts/profiles being absent. Managed production identity remains a future decision. The incoming React port still uses fixtures; Thermal remains the connected UI. Broader milestones below are not complete.

Thermal now has a local FastAPI/PostgreSQL resource backend. User steering requires real data: sourced campus resources and public events are available, while alumni histories/accounts remain absent. Thermal therefore starts with resource discovery, saved resources, and event snapshots; it does not fabricate the planned path/ask journey. The other browser prototypes and Expo still use local fixtures. The wider profile/path/ask milestones below depend on authorized alumni data and identity design.

**Current primary UI:** `prototypes/thermal/index.html`, selected by Christofort. Integrate and test the backend against Thermal first. Transit, Engineering Pad, and Expo remain prototypes for now; mobile remains product scope but does not block the first backend milestone. See [local testing and technology guide](backend-local-testing.md).

The service must support paths/resource discovery, community posts with club/event highlights, campus activities on a geographic map, and alumni shared cities, across web and mobile. All surfaces resolve the same event, resource, club, and profile IDs. Alumni cities are voluntarily shared locations, not live positions.

**Confirmed infrastructure:** AWS and PostgreSQL on Amazon RDS. **Proposed implementation:** one FastAPI application in a container, organized into feature modules; ECR and ECS Express Mode/Fargate for deployment. Keep one database and one API deployment initially. FastAPI supports routing by module within one application ([official guide](https://fastapi.tiangolo.com/tutorial/bigger-applications/)). This is a design recommendation, not a framework decision or dependency installation.

## $100 total AWS budget

Christofort confirmed **$100 for the entire project, not per month**. Develop and run routine tests on the local machine with PostgreSQL. Start with provider stubs/template fallbacks so local development incurs neither AWS charges nor paid model calls. Hosting changes deployment location, not application behavior.

The following are spending allocations, not AWS price quotes or an automatic spending cap:

| Allocation | Maximum planned spend |
| --- | --- |
| Scheduled cloud integration/demo windows: API, RDS, network/load balancer, frontend delivery | $50 |
| Supporting image/log/secret/backup storage and retained resources between windows | $10 |
| Uncommitted reserve for uncertainty, taxes, and unexpected usage | $40 |
| Total | $100 |

Before any provisioning, B14 must record region, exact sizes and quantities, runtime hours, storage retention, network layout, and a current pricing estimate. Use one demo environment and start with a short smoke-test window; extend only if projected cumulative spend stays within the $60 operating allocation. All windows combined share that allocation. Schedule cleanup at creation time. Do not assume free-tier eligibility or unverified credits. LLM/speech services billed outside AWS require a separate budget; AWS-hosted AI must fit this same allocation and cannot silently consume the reserve.

ECS Express Mode is still a candidate for a scheduled demo, not an always-on default. It adds underlying Fargate, load balancer, logging, and networking costs ([AWS overview](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-overview.html)). AWS's load-balancer pricing example uses a base $0.0225/hour: $16.20 over 30 days before usage and other services, illustrating why idle infrastructure matters ([pricing example](https://aws.amazon.com/elasticloadbalancing/pricing/)). Reprice the actual configuration; this example is not the complete deployment estimate.

Prefer one small Single-AZ RDS instance for a disposable demo, short log retention, capped API scaling, and minimal image retention. Avoid adding NAT gateways, RDS Proxy, extra environments, or optional paid components by default; compare a secure network configuration's complete cost before choosing it. Never expose the database publicly just to remove a networking charge. If the ECS/RDS estimate does not fit the window, shorten the window or revisit compute hosting with the team before spending; preserve local testing in either case.

Create a project-period AWS budget with actual/forecast alerts at $25, $50, $60, and $80, plus daily spend review during cloud sessions. Budget notifications are delayed monitoring, not a hard cap ([AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)). At $60, stop extending paid sessions and review retained charges. Teardown must account for database data/backups, running compute, load balancers, IPs, images, and logs. Preserve needed data before deleting demo resources; verify remaining charges afterward. Merely stopping RDS is insufficient: storage still incurs charges and a stopped instance automatically restarts after seven days ([RDS stop behavior](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_StopInstance.html)).

## Design process

For each feature, use this sequence before building its complete implementation:

1. Write the user journey and its failure states: actor, input, visible result, and what persists.
2. Agree on the shared records and ownership with role 1; specify which fields are visible to each actor.
3. Write request/response examples, errors, pagination, and permission rules with the UI owner. Resolve differences from the current prototype in `mvp.md` before changing consumers.
4. Implement a thin vertical slice against fixtures or the real database, with explicit demo mode. Exercise it from a client early.
5. Verify persistence, unauthorized access, missing data, and retries where relevant. Add AI or speech only after the underlying data path works.
6. Record the result and remaining decisions in the parent issue. A backend slice is complete when the consumer can use it, not merely when an endpoint returns 200.

### Decisions and gates

| Decision | Recommendation to review | Owner / blocks |
| --- | --- | --- |
| Framework and database integration | FastAPI; agree on one PostgreSQL driver/transaction convention with role 1 | Role 2 + role 1; B02/B03 |
| Identity | Managed identity provider with server-validated credentials; map provider subject to a local account. Select provider and web/mobile session flow together. AWS hosting does not itself select Cognito. | Roles 2/4; authenticated B04 onward |
| Permissions | Own profile edits; author-owned posts; asks visible to sender/recipient; city opt-in applied to aggregate and detail results; define who can publish club events | Roles 1/2/4/5; B04/B07–B10 |
| Resource model | Resolve sources, skill extraction, sparse-data behavior, and search baseline in #14 | Role 1 with 2/3; affected schema/query work, B06/B11 |
| Maps | Normalized place/city IDs, missing-coordinate behavior, bounds/date filters. PostGIS only if agreed query needs justify it. | Roles 1/2/5, #13; B09/B10 |
| Voice | First slice proposal: push-to-talk, editable transcript, then the same search as typed input. Decide spoken output separately; no assumption of continuous conversation. | Roles 2/3, #19; B12 |
| AI | Select provider/model after agreeing on grounded tasks, latency/cost limits, and fallback cases. Embeddings remain conditional on #14. | Roles 1/2/3; live provider portion of B11 |
| Hosting | Local development first; confirm region, billing owner, service choice, database version, secrets/access, scheduled runtime, and cost estimate within the $100 total constraint | Role 2 with team, #3/#21; cloud B14 |

Contracts, fixtures, and API scaffolding can progress while unrelated decisions are open. Do not bypass #14 by freezing affected resource tables or inventing a ranking algorithm in role 2.

## Service boundaries and data flow

```text
Browser / Expo client
        |
        v
API validation + identity + visibility
        |
        +-- profiles / progress / asks / posts --> transactions --> PostgreSQL
        +-- path / people / resources / maps --> role 1 queries --> PostgreSQL
        +-- discovery / ask drafts --> permitted records --> AI adapter
        +-- voice --> speech adapter --> text discovery
```

Use feature modules under the planned `backend/api/` ownership boundary: accounts/profiles, paths/people, asks, community/events, maps, discovery, and provider adapters. Role 1's `backend/engine/`, `backend/events/`, and `backend/seed/` retain their ownership. Define callable query results and transaction ownership together; avoid duplicating schema definitions or lifting SQL scoring into prompts.

Data handoff needs account/profile association, student year, saved goal/progress, activities and participation, asks, posts, clubs/resources/events, campus places, and normalized cities with sharing preferences. These are requirements for role 1's schema, not a second schema proposal to implement independently.

Visibility must be enforced in the query path before pagination, aggregation, and AI context construction. A city count and its people list must use the same eligible population. Do not reveal a hidden profile through a count, search excerpt, shared tie, or generated answer. Define the permitted cohort for path evidence explicitly so privacy filtering does not silently produce inconsistent numerator/denominator statistics.

## Contract outline to settle in B01

All paths below use `/api`. Existing routes come from [the MVP contract](mvp.md#api-contract); additional routes and fields are **proposals**. B01 must turn this outline into complete examples and OpenAPI schemas before dependent consumers integrate.

| Capability | Existing / proposed routes | Contract work |
| --- | --- | --- |
| Health | Proposed `GET /health`, `GET /ready` | Process health versus database readiness; no secrets in responses |
| Identity/profile/progress | Proposed `GET/PATCH /me`, `PUT/DELETE /me/activities/{id}`, `PUT /me/goal` | Server identifies actor; explicit city sharing; idempotent progress updates; profile and goal validation |
| Paths and people | Existing `POST /path`, `GET /people` | Resolve goal IDs, specify `school_year` and `typical_year`, evidence/no-match states and visible people; production personalization uses authenticated actor |
| Asks | Existing create/detail/accept; proposed `GET /asks?direction=sent|received` | Complete canonical Ask object, participant permissions, paginated outbox/inbox, retry behavior |
| Community | Proposed `GET/POST /posts`, `GET/PATCH/DELETE /posts/{id}` | Text-first posts, author attribution, owner controls, linked shared records, chronological cursor pagination |
| Resources/clubs/events | Proposed list/detail reads; existing `POST /events` | Shared identifiers, sources, date filters, upcoming highlights; decide event-publisher privileges |
| Campus map | Proposed `GET /maps/campus?bbox=...&from=...&to=...` | Validated coordinate bounds, location/event references, capped results and truncation behavior |
| Alumni cities | Proposed `GET /maps/alumni`, `GET /cities/{id}/alumni` | Opt-in visibility before grouping; normalized city/region/country, centroid, optional agreed filters/counts |
| Discovery/drafting | Proposed `POST /discovery`, `POST /asks/draft` | Structured matches with record references, explanation, degraded/no-match/clarification state; drafting does not send |
| Speech | Proposed `POST /speech/transcriptions`; synthesis conditional | Allowed formats/size/duration, timeout, editable text; finalize only after voice decision |

Prefer server-issued IDs; settle their JSON representation once with role 1 and consumers. Use ISO 8601 timestamps with time zones; clients render “Just now” and other relative labels. A proposed list envelope is `{ "items": [], "next_cursor": null }`; a proposed error envelope is `{ "error": { "code": "...", "message": "...", "request_id": "..." } }`. Document validation, authentication, denied/hidden records, conflicts, throttling, and temporary dependency failures with their HTTP codes.

The original `student_id` fields and `/students` switcher support demo identities. In authenticated mode, reject mismatched actor IDs or replace them with `/me` semantics through an explicit compatibility adapter. A reply URL identifies a page; it is not permission to accept an ask. Proposed first release requires the recipient's authenticated account. Signed invitation links are a separate decision, not an implicit public ID-based authorization mechanism.

Persist an ask only when the user sends it; `sent -> accepted` is the defined transition. Repeated acceptance returns the same accepted record. Scope a create idempotency key to actor and operation, store it transactionally with the result, and reject reuse with a different payload. Specify retention and retry behavior in B07. Ignored/completed transitions and calendar booking remain undefined. Apply the same retry discipline to post creation, where a mobile retry could otherwise create duplicates.

## AI and voice behavior

Goal interpretation produces validated structured fields and candidate IDs; role 1's queries resolve those candidates. Search retrieves permitted resources, events, clubs, and people before the model drafts an explanation. Validate returned references against that result set. Return evidence counts from SQL unchanged. Alumni-path lift remains a feature-specific association measure; it does not filter out common campus resources from general discovery.

Keep factual text tied to returned records. An ask draft may use verified shared ties and user-provided intent; the sender reviews it. Treat retrieved descriptions and posts as data, not instructions. Model-generated output cannot write records, send an ask, or change permissions.

Define a small evaluation set: known goal, ambiguous goal, no match, common campus resource, sparse alumni evidence, invented resource request, hidden profile, instructions embedded in a resource, provider timeout, and malformed model output. Require valid references and unchanged evidence, with no substitution of the fixed demo goal.

Use bounded provider timeouts and request limits, with these recoveries:

| Failure | Useful result |
| --- | --- |
| Missing AI configuration / timeout / invalid output | Deterministic search and clearly marked template ask drafting |
| No matching goal or sparse evidence | No-match/clarification or insufficient-evidence state; resources may still be browsed |
| Microphone denied / upload rejected / speech unavailable | Typed query remains available; no invented transcript |
| Optional spoken response unavailable | Keep the visible text result |

Send providers only the fields needed for the requested task. Decide audio retention before enabling uploads; proposed default is transient processing without application storage of raw audio. Do not log raw audio, auth tokens, or private ask bodies. Capture request IDs, latency, fallback reason, and provider usage for diagnosis. API keys remain server-side.

## Client migration

Thermal now uses a separate asynchronous HTTP adapter for real-resource discovery and saved items, with loading/error/retry states and timeouts. It no longer loads `window.WarmPathFake`. The other prototypes retain their fixture API. Further feature integration must preserve that boundary and the visual presentation.

The fixed denominator `14`, demo alumni totals, and synthesized missing asks have been removed from connected Thermal. Alumni evidence and asks remain unavailable until authorized data and accounts exist. When implementing that future slice, refresh ask status with bounded visible-view polling, use the agreed ID representation, and enforce recipient identity. Do not reintroduce the prototype's “No account needed” behavior.

Keep explicit fixture and connected modes while each slice is integrated. Never silently fall back to fabricated success when a connected write fails. Client owners add adapters from canonical server shapes to their UI models, including the mobile `Ask` fields `student_name`, `alum_name`, and display timestamps.

Replace `Date.now()` goal/ask IDs with server records, restore profile/progress/outbox on a fresh device, and replace the demo accept modal's identity switching with the agreed recipient flow in connected mode. Local animation/preferences can remain local. The “weekly event reminders” UI toggle does not by itself require a notification service.

Every web/mobile slice must demonstrate loading, empty, failed, retrying, and persisted-success states. Keep sample data visibly identified. Authentication and Expo compatibility require coordination with role 4; feature integration remains with each UI owner.

## Delivery milestones

| Milestone | Issue drafts | Demonstration / exit condition |
| --- | --- | --- |
| 1. Contract and foundation | B01–B03; draft B14's cost worksheet | Local API and PostgreSQL start from documented commands; health/readiness and sourced resource reads work through Thermal; contracts resolve current client gaps |
| 2. Persistent path and ask | B04–B07; start B13 with Thermal | Sign in, save progress, load a path, send an ask, accept as recipient in a separate browser session; sender refresh sees persisted status |
| 3. Shared campus/community data | B08–B10; extend B13 | Create a post, open the same event from feed and campus map, explore only shared alumni cities; visibility change updates both city counts and people |
| 4. Grounded discovery and voice | B11–B12; finish B13/B14 | Typed and voice queries resolve shared records, provider failure preserves text/search, all experiences work on deployed web/mobile clients |

Prepare deployment configuration early, then run a scheduled cloud health/read smoke test after the local slice passes and the cost worksheet fits the operating allocation. Use local testing between scheduled cloud windows. B14 continues through release, but no milestone requires an idle AWS environment to remain running.

ECS Express Mode can configure a Fargate service and supporting load balancer/networking; the underlying resources still incur charges ([AWS documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-overview.html)). Before provisioning, record the team billing owner and selected configuration. Use environment-specific secrets, restricted database access, an explicit migration step, and a rollback/runbook that accounts for schema compatibility. Deployment is planned here, not authorized or performed by this document.

Release checks cover fresh database setup, persistence across restart, ownership/visibility, concurrent/retried writes, path scoring integration, provider outages, cross-device asks, and shared event identity across clients. Use automated tests for those consequential behaviors and a short integrated demo for the end-to-end experience. Each issue records the evidence relevant to its slice.
