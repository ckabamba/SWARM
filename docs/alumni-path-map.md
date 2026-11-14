# SWARM: alumni path map

Nov 13, 2026 · @Alfred

Type a goal such as "SWE internship at NVIDIA" and WarmPath shows the route alumni took to get there (the VIP teams, clubs and courses they shared), highlights the alumni whose starting point was closest to yours, drafts a message to each, and shows the next event at every stop.

## Map or social media?

A map, but of paths to a goal, not of campus. Think of a transit map: you are the station on the left, the goal is on the right, and the stops between are the VIP teams, clubs and courses alumni passed through.

A social feed is the wrong shape for three reasons. It needs fresh content and a crowd from day one, so it would look empty at the demo. LinkedIn already owns it. And a feed has no destination, while a goal does. A campus map is wrong too, because location is not what decides who gets the internship.

Borrow two things from social apps: a profile (so the app knows your starting point) and a one-tap request. Skip posts, likes and chat.

The four screens:

1. **Goal box.** One text field: "SWE internship at NVIDIA", "get into robotics research", "launch a startup".
2. **Path map.** You on the left, the goal on the right. Each stop is sized by how many alumni who reached the goal went through it. Stops you already have are lit; the next best stop is flagged.
3. **People panel.** Tap a stop or the goal to see the alumni behind it, sorted by how close their starting point was to yours, each with the tie you share and an Ask button with a drafted message.
4. **Alum reply page.** The alum sees who is asking, the shared tie and the specific question, and accepts a 15-minute call in one tap.

## User, pain and why now

**User:** a first- or second-year student with a specific goal and no one to ask. They pick clubs and VIP teams by guesswork and send cold LinkedIn messages that go unanswered.

**Pain:** the knowledge of what worked sits in thousands of alumni histories that no one has put side by side. Advisers give general advice; the alumni directory gives names without paths.

**Why now:** LLMs can turn a free-text goal into a structured target and draft a good ask, and a donor is funding this exact prompt. The path calculation itself is plain counting, which keeps the build small.

## How the matching works

Three tables and four steps; only steps 1 and 4 use an LLM.

| Table | Holds |
| --- | --- |
| Person | Name, major, graduation year, student or alum |
| Activity | Anything a person can pass through: VIP team, club, course, research lab, internship, job |
| PersonActivity | Who did which activity, and in which year of school |

1. **Parse the goal.** The LLM turns "SWE internship at NVIDIA" into a target activity (role plus company), with embeddings to catch near matches such as other chip companies.
2. **Find the achievers.** Select alumni who have that target activity.
3. **Score the stops by lift, not raw count.** For each activity the achievers did before the target, compare its share among achievers with its share among all alumni. A club everyone joins scores near 1 and drops out; a VIP team that achievers joined at four times the base rate rises to the top.
4. **Rank the people.** Score each achiever by overlap with the student's major, year and current activities, plus any direct shared tie. The LLM drafts the ask using that tie and the student's next stop.

Log every accept, ignore and completed call, and add reply rate to the people ranking once there is any data.

## Events at each stop

Every stop and goal on the map shows its next event, so the plan comes with something to attend this week. Events come from two sources.

- **Parsed:** student-org listings from Engage and career-center events, pulled on a schedule and matched to a stop by org or company name, with the LLM handling near matches.
- **Posted:** a club officer, alum or recruiter fills in a short form (title, time, place, link, and the stop or company it belongs to).

One more table, Event: title, start time, location, link, source, and the Activity it belongs to.

Events appear in two places: a date badge on the stop itself, and a "This week on your path" strip under the map, sorted by date. Only events tied to a stop on your path appear, which is what keeps this from becoming a feed.

Build it after step 4 in the build order. In the first hour, check whether Engage's listings can be pulled automatically; I have not verified that. If not, hand-enter 20 real events and present the parser as the next step.

In the demo, after the map draws, point at the flagged next stop: "and their info session is Tuesday."

## MVP stack and build order

One Python backend, one React page with a graph component, and a seeded database are enough.

| Layer | Choice | Google Cloud version |
| --- | --- | --- |
| Front end | React with React Flow for the path map | Firebase Hosting |
| Backend | FastAPI or Django | Cloud Run |
| Database | Postgres (pgvector optional at this size) | Cloud SQL, or Firestore |
| LLM | Any chat and embedding API | Gemini |
| Email to alumni | A link to the reply page; real sending is optional | Same |

Build in this order, so that stopping after any step still leaves a demo:

1. **Seed data.** A script that generates about 300 alumni with activities, with real patterns planted (for example, NVIDIA interns over-represented on two VIP teams). Without planted patterns the map shows noise.
2. **Path query.** Steps 2 and 3 above as SQL, returning the top stops for a goal.
3. **Path map screen.** Goal box plus the graph.
4. **People panel and drafted ask.**
5. **Second student profile**, to show different people for the same goal.
6. **Alum reply page.**

Cut without regret: login, chat, a general events feed (events show only on stops), real data import, mobile layout.

## Team of five

Five roles with no shared files; agree on the API's JSON shapes in the first 30 minutes so both front-end people can build against fake data.

| Person | Role | Owns | Done when |
| --- | --- | --- | --- |
| 1 | Data and path engine | Database schema, seed script with planted patterns, the lift query, people ranking | A goal ID returns ranked stops and ranked alumni |
| 2 | Backend and LLM | API endpoints, goal parsing, drafted messages, deployment | Free-text goal in, full JSON for the map out, running on a public URL |
| 3 | Front end: path map | Goal box, the graph, event badges, student-profile switcher | Typing a goal draws the map; switching student redraws it |
| 4 | Front end: people and forms, plus design | People panel, Ask flow, alum reply page, event post form, colours and type | Ask on one phone shows up and is accepted on another |
| 5 | Events and pitch | Engage and career-event parser (or hand entry), event-to-stop matching, slides, demo script, roster test with two clubs, judge Q&A | 20 or more real events on stops; a rehearsed two-minute demo |

There is no chatbot to build. The LLM work is two prompts (parse the goal, draft the message), which is why person 2 also takes deployment. Person 1 has the hardest logic and should not be given anything else. Person 5's parser is the first thing to drop if time runs short, because the pitch cannot be.

## Demo script

Five beats, about two minutes; the wow is beat 3.

1. **The problem.** "I want an NVIDIA internship. Which of the VIP teams and student orgs gets me there? Nobody can tell me."
2. **Type the goal.** The path map draws itself: you, the stops, the goal, with a count on each stop.
3. **Switch student.** Change the profile from a CompE second-year to a CS first-year. The flagged next stop and the top three alumni change. Same goal, different route.
4. **Tap an alum.** Show the shared tie and the drafted message; press Ask.
5. **Accept on a second phone.** The alum page shows the request; one tap books the call.

Then ask a judge for a goal and run it live. Seed a few goals beyond internships (research, startup, grad school) so an off-script request still returns a path.

## Riskiest assumption, fallback, hook

**Riskiest assumption:** records of what alumni did on campus (VIP teams, clubs, labs) can be collected. Job histories are easy to find; campus histories are not, and the path map is empty without them.

**Cheap test before judging:** ask two clubs or VIP teams whether they keep past rosters and would share them. Two yeses on a slide is real evidence.

**Fallback:** start with one community that already has rosters (a single VIP team or club and its alumni), and let alumni add their own history in a two-minute form when they accept their first request. Demo on seeded data and say so.

**Second risk:** alumni don't reply. The path map still gives the student a plan, which is why this version is safer than intros alone.

**30-second hook:** "Every year, Tech students land the internship you want. They joined certain teams and took certain classes, and then they graduated and took that knowledge with them. WarmPath puts their paths on one map. Type your goal, see the route people like you took, and message the three who started where you are. Watch: SWE internship at NVIDIA."

## Alumni finding alumni in another city

The same engine handles it with one extra field, city, on Person. A goal such as "moving to Austin, working in robotics" targets a city and a field, and returns alumni there ranked by shared ties (same lab, same club, overlapping years), plus local alumni events.

This case is simpler than the student one: there are no stops to compute, only people and events. Do not build separate screens for it. Add city to the seed data, prepare one query, and use it as the last 15 seconds of the demo: "and the same map works after graduation." The prompt names students and alumni, so showing both counts.

## Judge questions and money

| Question | Answer |
| --- | --- |
| Isn't this a RAG chatbot? | No chat and no retrieved text. The stops come from counting real alumni paths, the people differ per student, and it ends in a booked call. |
| Why not LinkedIn? | LinkedIn shows jobs, not the campus steps before them, and it can't compare a student's starting point with an alum's. |
| Where does the data come from? | Opt-in: club and VIP rosters, plus alumni adding their own history. No scraping of LinkedIn, which its terms prohibit. |
| Isn't the map just correlation? | Yes, and the app says so: "9 of 14 did this", not "this causes that". Lift filters out what everyone does. |
| What about privacy? | Alumni choose what appears and can show a path without a name. |
| How does it make money? | Annual licence to university career and alumni offices; later, employers pay to see which campus paths feed their hires. |
