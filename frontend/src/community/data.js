import api from '../shared/fake-api.js'

/*
 * Social Jackets fixtures. Everything here is invented: the profiles are the two demo
 * students from the path fixture, and the clubs and events are that fixture's records
 * under stable ids, so a club or event opens the same record from any experience.
 * These stay client-side until the community contracts in docs/mvp.md are specified.
 */
const PATH = api.postPath({ goal: api.SEEDED_GOALS[0], student_id: 1 })

const MAJOR_NAMES = { CompE: 'Computer Engineering', CS: 'Computer Science' }
const SUMMARIES = {
  1: 'Exploring robotics and campus projects.',
  2: 'Interested in systems and robotics.',
}

export const PROFILES = Object.fromEntries(api.getStudents().map((s) => [`person:${s.id}`, {
  id: `person:${s.id}`,
  name: s.name,
  major: s.major,
  majorName: MAJOR_NAMES[s.major] || s.major,
  year: `${api.ordinal(s.school_year)} year`,
  summary: SUMMARIES[s.id],
}]))

export const CLUBS = PATH.stops.filter((stop) => stop.type === 'club').map((stop) => ({
  id: `club:${stop.activity_id}`,
  type: 'club',
  title: stop.name,
  summary: `${stop.name} is a student club in the demo data, shared with the path map.`,
  source: 'Demo fixture, shared with the path map',
}))

export const EVENTS = PATH.events.map((event) => {
  const stop = PATH.stops.find((item) => item.activity_id === event.activity_id)
  return {
    ...event,
    id: `event:${event.id}`,
    type: 'event',
    organizer: stop.name,
    clubId: stop.type === 'club' ? `club:${stop.activity_id}` : null,
    source: 'Demo fixture. Invented, not a real event listing',
  }
}).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))

export const RECORDS = new Map([...CLUBS, ...EVENTS].map((record) => [record.id, record]))

const SEED_POSTS = [
  { id: 'post:fixture-maya', authorId: 'person:1', createdAt: '2026-11-14T10:25:00-05:00', text: 'I finally got my line-following bot through a full test run this afternoon. Debugging it with someone who hit the same snag made the next step feel much clearer.', linkedRecordId: 'event:42' },
  { id: 'post:fixture-devon-1', authorId: 'person:2', createdAt: '2026-11-14T08:40:00-05:00', text: 'Looking for a small first step into systems work this semester. The embedded vision demo gave me a good list of questions to explore next.', linkedRecordId: null },
  { id: 'post:fixture-devon-2', authorId: 'person:2', createdAt: '2026-11-13T15:20:00-05:00', text: 'I made a short checklist for my first robotics build: test one thing, write down what changed, and ask for another set of eyes when I get stuck.', linkedRecordId: 'club:5' },
  { id: 'post:fixture-maya-2', authorId: 'person:1', createdAt: '2026-11-12T12:05:00-05:00', text: 'A good campus event for me is one where I leave with a new question to try. I’m adding this week’s demo night to my calendar.', linkedRecordId: 'event:41' },
]

/* Posts written in the composer live here, so they survive a visit to another page but not a reload. */
export const session = { posts: SEED_POSTS }

export function isSessionPost(post) {
  return post.id.startsWith('post:session:')
}

export function formatPostTime(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
  }).format(new Date(value))
}
