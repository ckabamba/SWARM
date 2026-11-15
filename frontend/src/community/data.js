import { useSyncExternalStore } from 'react'
import fake from '../shared/fake-api.js'
import api from '../shared/api.js'
import { DATA_SOURCE, load } from '../shared/data-source.js'

/*
 * Social Jackets data. Components read one shape, whatever the source:
 *
 *   post     { id, authorId, createdAt, text, linkedRecordId }
 *   profile  { id, name, major, majorName, year, summary, note }       in PROFILES, by id
 *   record   { id, type: 'event' | 'club' | 'resource', title, ... }   in RECORDS, by id
 *
 * In fixture mode everything below is invented: the profiles are the two demo students
 * from the path fixture, and the clubs and events are that fixture's records under stable ids.
 *
 * In api mode (see shared/data-source.js) the feed comes from GET /api/posts and the events
 * from GET /api/events, adapted to the shapes above in this file. If either call fails, that
 * list falls back to its fixture. Clubs, the composer and the signed-in profile stay on
 * fixtures until the backend has endpoints the page can use for them.
 */
const PATH = fake.postPath({ goal: fake.SEEDED_GOALS[0], student_id: 1 })

const MAJOR_NAMES = { CompE: 'Computer Engineering', CS: 'Computer Science' }
const SUMMARIES = {
  1: 'Exploring robotics and campus projects.',
  2: 'Interested in systems and robotics.',
}

export const PROFILES = Object.fromEntries(fake.getStudents().map((s) => [`person:${s.id}`, {
  id: `person:${s.id}`,
  name: s.name,
  major: s.major,
  majorName: MAJOR_NAMES[s.major] || s.major,
  year: `${fake.ordinal(s.school_year)} year`,
  summary: SUMMARIES[s.id],
  note: 'An invented demo profile. It is not a real account.',
}]))

export const CLUBS = PATH.stops.filter((stop) => stop.type === 'club').map((stop) => ({
  id: `club:${stop.activity_id}`,
  type: 'club',
  title: stop.name,
  summary: `${stop.name} is a student club in the demo data, shared with the path map.`,
  source: 'Demo fixture, shared with the path map',
}))

/* The fixture events. The page shows these in fixture mode, and whenever GET /api/events fails. */
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

const FIXTURE_NOTE = 'Demo data. The profiles, posts and events here are invented, and the events are not real listings.'

/* ---------- adapting the backend's shapes ---------- */

/* Event links are keyed by URL. A short stable id keeps record ids readable. */
function shortId(text) {
  let hash = 5381
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0
  return hash.toString(36)
}

const KIND_NAMES = { student: 'student', alum: 'alum', alumni: 'alum' }

/* The author block of a post from backend/api/community.py `rendered()`. The feed carries name, kind and major only. */
function adaptAuthor(author) {
  const id = `person:api:${author.id}`
  PROFILES[id] = {
    id,
    name: author.name,
    major: author.major || 'Major not shared',
    majorName: author.major || 'Not shared',
    year: KIND_NAMES[author.kind] || author.kind || 'member',
    summary: 'The feed does not carry the rest of this public profile yet.',
    note: 'A WarmPath account with a public profile.',
  }
  return id
}

/* An event from GET /api/events, or the linked_record of a post. Both are keyed by the listing's URL. */
function adaptEvent(event) {
  const id = `event:${shortId(event.key || event.url)}`
  const record = {
    id,
    type: 'event',
    title: event.title,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    location: event.location || 'Location not listed',
    organizer: event.organizer || event.source || 'Georgia Tech',
    link: event.url,
    clubId: null,
    source: `${event.source || 'Public listing'}. Confirm the schedule at the source`,
  }
  RECORDS.set(id, record)
  return record
}

function adaptResource(resource) {
  const id = `resource:${resource.key}`
  RECORDS.set(id, {
    id,
    type: 'resource',
    title: resource.title,
    summary: resource.description || '',
    link: resource.url,
    source: resource.source_url ? `Campus resource catalog, checked against ${resource.source_url}` : 'Campus resource catalog',
  })
  return id
}

function adaptPost(post) {
  const linked = post.linked_record
  return {
    id: `post:${post.id}`,
    authorId: adaptAuthor(post.author),
    createdAt: post.created_at,
    text: post.body,
    linkedRecordId: !linked ? null : linked.kind === 'event' ? adaptEvent(linked).id : adaptResource(linked),
  }
}

/* ---------- the store the page reads ---------- */

/* In api mode the lists start empty and `loading`, so fixture people never flash in a feed of real posts. */
let state = DATA_SOURCE === 'api'
  ? { posts: [], events: [], loading: true, note: '' }
  : { posts: SEED_POSTS, events: EVENTS, loading: false, note: FIXTURE_NOTE }
const listeners = new Set()

function set(next) {
  state = { ...state, ...next }
  listeners.forEach((fn) => fn())
}

function noteFor(postsSource, eventsSource) {
  if (postsSource === 'fixture' && eventsSource === 'fixture') return FIXTURE_NOTE
  const posts = postsSource === 'api' ? 'Posts are from WarmPath accounts with a public profile.' : 'The posts here are invented demo data.'
  const events = eventsSource === 'api' ? 'Events are public Georgia Tech listings; confirm details at the source.' : 'The events here are invented, not real listings.'
  return `${posts} ${events} Clubs and your own profile are still demo data.`
}

let started = false
/* Fetch the feed and events once. Does nothing in fixture mode. */
export function loadCommunity() {
  if (started || DATA_SOURCE !== 'api') return
  started = true
  Promise.all([
    load('Community feed', async () => (await api.posts({ limit: 50 })).items.map(adaptPost), () => SEED_POSTS),
    load('Events', async () => (await api.events()).items.map(adaptEvent), () => EVENTS),
  ]).then(([posts, events]) => {
    // Keep anything written in the composer while the request was in flight.
    const written = state.posts.filter(isSessionPost)
    set({ posts: [...written, ...posts.data], events: events.data, loading: false, note: noteFor(posts.source, events.source) })
  })
}

/* { posts, events, loading, note } for the page. `note` is the line under the stream that says where the data is from. */
export function useCommunity() {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn) }, () => state)
}

/* Add a post written in the composer. It lives in this store, so it survives a visit to another page but not a reload. */
export function addSessionPost(post) {
  set({ posts: [post, ...state.posts] })
}

export function isSessionPost(post) {
  return post.id.startsWith('post:session:')
}

export function formatPostTime(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
  }).format(new Date(value))
}
