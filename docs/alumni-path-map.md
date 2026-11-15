# WarmPath: alumni-path feature rationale

Originally proposed November 13, 2026 by @Alfred. Updated November 14, 2026 to clarify this feature's place in the expanded service.

This document preserves the useful reasoning behind the original path-map proposal. The current product vision is in [README.md](../README.md), and release scope and contracts are in [mvp.md](mvp.md). This document does not impose product-wide exclusions.

## Place in the service

WarmPath has three core experiences: paths and campus-resource discovery through text and voice; a community feed with student/alumni posts and club/event highlights; and interactive geographic maps for campus activities and alumni cities. All three are in scope for web and mobile.

The alumni-path feature helps a student explore a goal such as "SWE internship at NVIDIA," see activities alumni shared, find people with similar starting points, and draft an outreach request. It complements the feed and geographic maps through shared profiles, clubs, resources, and events.

## User need and original interaction

A student with a goal may not know which clubs, VIP teams, courses, or alumni to approach. Alumni campus histories can make relevant experiences and shared ties easier to discover. The evidence describes associations and individual histories, not a guaranteed route to an outcome.

The original prototype explores four interactions:

1. Enter a goal.
2. View a path graph with activities, counts, existing experience, and a suggested next step.
3. Open the people panel to inspect shared ties and edit a drafted ask.
4. Open an alum reply page and accept a request for a 15-minute call.

Text and voice resource discovery extends this entry point. The two-profile switch is a demonstration of personalization, not a replacement for real user profiles.

## Matching and lift

The original model uses Person, Activity, and PersonActivity to connect people with experiences and school years. Event and Ask records support attendance opportunities and outreach. See the current spec for the existing draft and proposed additions.

1. Resolve a goal to a supported target activity.
2. Find alumni who reached that target.
3. Compare earlier activities among those alumni with their prevalence among all alumni.
4. Rank relevant alumni by shared activities, major, and timing, and draft a message grounded in the strongest shared tie.

The proposed association measure is:

```text
lift = (achievers who did the activity / all achievers)
       / (alumni who did the activity / all alumni)
```

If 40% of NVIDIA interns joined a club and 10% of all alumni joined it, lift is 4. A common activity with lift near 1 provides little distinction for that goal. High lift with a very small sample can be misleading, so the proposal also uses minimum support and visible counts.

These are path-analysis rules. A popular club can still be useful in resource discovery, prominent in the community feed, and visible on the campus map. An LLM may interpret goals and explain results, but counts and statistical scores must come from recorded data.

People ranking originally weighted shared activities most, then major and year. Adding reply history to ranking is a future proposal requiring sufficient data, not an existing capability.

## Events and geographic discovery

An upcoming event at a relevant stop turns exploration into an action a student can take. Path badges and a chronological path-events strip are useful presentations, alongside the community's campus-wide event highlights and the geographic campus map.

Potential sources include club-maintained postings and public Engage or career-center listings. Automated access and matching must be verified before promising an integration. Hand-entered, source-linked real listings can support an early demonstration; invented fixtures must remain labeled.

The alumni-city map is also a core geographic experience. It shows cities alumni choose to share on their profiles and allows exploration of the people there. City counts and filters for company, industry, major, or shared clubs are proposed details. It uses city-level locations rather than live tracking and is not contingent on computing an alumni path.

## Development sequence

The original path feature can be built incrementally: generated fixtures, lift query, graph, people and drafted ask, personalization, and persisted request/acceptance. This is a feature-level sequence within the broader roadmap in the README.

The existing prototypes cover the visual flow using fake data and local storage. Shared backend persistence is needed for actual acceptance across separate devices. An accepted ask records willingness to speak; it does not itself reserve a calendar slot.

The shared service, community UI, geographic maps, voice capabilities, and mobile implementation need their own delivery work. The old path-only hackathon sequence is not the full release plan. Current ownership is recorded in the README; Christofort Kabamba owns Backend and LLM.

## Path-feature demo

1. Enter an internship goal and show its activity counts.
2. Switch between two sample students and show different next steps and alumni.
3. Inspect a shared tie, edit a message, and send an ask.
4. Accept on another device once the shared backend is implemented.
5. Open a relevant event and its campus location.
6. Demonstrate a non-internship goal, then connect the feature to the community and alumni-city experiences.

The broader release demonstration must also cover posting/event highlights, both geographic views, text/voice access, and mobile behavior. Do not describe the original prototypes as already supporting these capabilities.

## Assumptions and questions to validate

- **Campus histories:** the original proposal's key risk is obtaining useful alumni activity histories. Ask clubs and VIP teams about opt-in roster contributions and let alumni supply their own histories. Generated fixtures help development but do not validate this assumption.
- **Alumni response:** shared ties may make outreach more relevant, but reply behavior needs testing. Resource discovery and events provide value even before a reply.
- **Accuracy:** show counts and association, never claim that an activity causes an internship or other outcome.
- **Visibility:** users should understand which profile information, including city, is shown. Real-user data sources and permissions need explicit decisions.
- **Differentiation:** the proposed value is connecting campus resources, community activity, alumni relationships, and places in one service. LinkedIn-style posting is part of that experience.
- **Business model:** university licensing and employer-facing offerings were early hypotheses, not settled product requirements.
