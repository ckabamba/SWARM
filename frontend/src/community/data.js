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
 * list stays empty and the note under the stream says so; fixtures never stand in for it.
 * A signed-in account (shared/account.js) posts through POST /api/posts. The backend has
 * campus resources, not clubs, so api mode lists no clubs.
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

/* Invented clubs, for fixture mode only. */
export const CLUBS = DATA_SOURCE === 'api' ? [] : PATH.stops.filter((stop) => stop.type === 'club').map((stop) => ({
  id: `club:${stop.activity_id}`,
  type: 'club',
  title: stop.name,
  summary: `${stop.name} is a student club in the demo data, shared with the path map.`,
  source: 'Demo fixture, shared with the path map',
}))

/* The fixture events. The page shows these in fixture mode only. */
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
  // The path fixture decides which clubs and events exist. Drop a link to one it no longer has, so the page never looks up a missing record.
].map((post) => (RECORDS.has(post.linkedRecordId) ? post : { ...post, linkedRecordId: null }))

/* What a new post can link to, as { value, label } for the composer's menu. */
const FIXTURE_LINKS = [...EVENTS, ...CLUBS].map((record) => ({ value: record.id, label: `${record.type === 'event' ? 'Event' : 'Club'}: ${record.title}` }))
/* For the backend a link is a kind and a key. The menu carries both in one value: "event|<url>" or "resource|<id>". */
const eventLinks = (events) => events.filter((event) => event.link).map((event) => ({ value: `event|${event.link}`, label: `Event: ${event.title}` }))

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
  ? { posts: [], events: [], links: [], loading: true, note: '' }
  : { posts: SEED_POSTS, events: EVENTS, links: FIXTURE_LINKS, loading: false, note: FIXTURE_NOTE }
const listeners = new Set()

function set(next) {
  state = { ...state, ...next }
  listeners.forEach((fn) => fn())
}

/* Only called in api mode, where a source is 'api' or 'unavailable'. */
function noteFor(postsSource, eventsSource) {
  const posts = postsSource === 'api' ? 'Posts are from WarmPath accounts with a public profile.' : 'Posts could not be loaded. Reload the page to try again.'
  const events = eventsSource === 'api' ? 'Events are public Georgia Tech listings; confirm details at the source.' : 'Events could not be loaded. Reload the page to try again.'
  return `${posts} ${events}`
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
    // A post links to real records only. If the events call failed, `events.data` is empty.
    const links = [...eventLinks(events.data), ...resourceLinks]
    set({ posts: [...written, ...posts.data], events: events.data, links, loading: false, note: noteFor(posts.source, events.source), live: true })
  })
}

/* Read the feed again, for example after your own name changes. Keeps the current lists on screen meanwhile. */
export function reloadCommunity() {
  if (DATA_SOURCE !== 'api') return
  started = false
  fetched.clear()
  loadCommunity()
}

let resourceLinks = []
let askedForResources = false
/* Add campus resources to the composer's link menu. GET /api/community/options needs a signed-in account. */
export function loadResourceLinks() {
  if (askedForResources || DATA_SOURCE !== 'api') return
  askedForResources = true
  api.communityOptions().then(({ resources }) => {
    resourceLinks = resources.map((resource) => ({ value: `resource|${resource.id}`, label: `${resource.kind}: ${resource.name}` }))
    if (state.live) set({ links: [...eventLinks(state.events), ...resourceLinks] })
  }, (error) => {
    askedForResources = false
    console.warn(`[WarmPath] Link options: the backend call failed (${error.message}). Posts can still link to events.`)
  })
}

/* Share a post as the signed-in account. Rejects with the backend's message, for the composer to show. */
export async function publishPost(text, link) {
  const [kind, ...key] = link ? link.split('|') : []
  const saved = await api.createPost({ body: text, link_kind: kind || null, link_key: key.join('|') || null, request_id: crypto.randomUUID() })
  set({ posts: [adaptPost(saved), ...state.posts] })
}

const fetched = new Set()
/* Fill in a backend author's public profile the first time their drawer opens. The feed only carries name, kind and major. */
export function loadProfile(id) {
  if (!id.startsWith('person:api:') || fetched.has(id)) return
  fetched.add(id)
  api.profile(id.slice('person:api:'.length)).then(({ profile }) => {
    PROFILES[id] = {
      ...PROFILES[id],
      majorName: profile.major || 'Not shared',
      year: [KIND_NAMES[profile.kind] || profile.kind, profile.grad_year && `class of ${profile.grad_year}`].filter(Boolean).join(', '),
      summary: profile.introduction || 'No introduction yet.',
    }
    set({})
  }, () => fetched.delete(id))
}

/* { posts, events, links, loading, note, live } for the page. `live` is true when the feed is the backend's. `note` is the line under the stream that says where the data is from. */
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
