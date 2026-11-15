import { CommunityPost, CommunityResource, PublicEvent } from '../services/warmPathApi';

export const DEMO_ACCOUNT_ID = -100;
export const DEMO_STUDENT = {
  id: DEMO_ACCOUNT_ID,
  name: 'Jordan Lee',
  kind: 'student' as const,
  major: 'Computer Engineering',
  classOf: 2028,
  introduction: 'Fictional student profile used for the WarmPath mobile demo.',
};

export const DEMO_EVENTS: PublicEvent[] = [
  {
    url: 'demo-event:robotics-open-bench-01',
    title: 'Robotics open bench night',
    starts_at: '2026-11-19T23:00:00Z',
    ends_at: '2026-11-20T01:00:00Z',
    location: 'Innovation studio · fictional location',
    organizer: 'RoboCore student group · demo fixture',
    source: 'Fictional demo data',
  },
  {
    url: 'demo-event:study-hall-02',
    title: 'Peer study hall',
    starts_at: '2026-11-21T18:00:00Z',
    ends_at: '2026-11-21T20:00:00Z',
    location: 'Library room 204 · fictional location',
    organizer: 'Jackets Study Circle · demo fixture',
    source: 'Fictional demo data',
  },
];

export const DEMO_RESOURCES: CommunityResource[] = [
  { id: -201, name: 'RoboCore student group', kind: 'Fictional club fixture' },
  { id: -202, name: 'Jackets Study Circle', kind: 'Fictional club fixture' },
];

export const DEMO_DISCOVERY_RESOURCES = [
  { id: 'demo-resource-robotics', name: 'RoboCore student group', kind: 'Club', summary: 'A fictional student group for demonstrating stable community and discovery links.', url: '', source_url: '' },
  { id: 'demo-resource-study', name: 'Jackets Study Circle', kind: 'Club', summary: 'A fictional peer study group. This record is not a real campus organization.', url: '', source_url: '' },
];

function eventLink(event: PublicEvent) {
  return {
    kind: 'event' as const,
    key: event.url,
    title: event.title,
    url: '',
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    location: event.location,
    organizer: event.organizer,
    source: event.source,
  };
}

export const DEMO_POSTS: CommunityPost[] = [
  {
    id: -1,
    body: 'Our project team is opening a few extra work tables this week. Bring a small idea and we can help you get started with the tools.',
    version: 1,
    created_at: '2026-11-14T19:30:00Z',
    updated_at: '2026-11-14T19:30:00Z',
    author: { id: -101, name: 'Maya Chen', kind: 'student', major: 'Mechanical Engineering' },
    link_kind: 'event',
    link_key: DEMO_EVENTS[0].url,
    linked_record: eventLink(DEMO_EVENTS[0]),
  },
  {
    id: -2,
    body: 'I made a checklist for my first circuits lab. Happy to compare notes with anyone working through the same material.',
    version: 1,
    created_at: '2026-11-13T16:10:00Z',
    updated_at: '2026-11-13T16:10:00Z',
    author: { id: -102, name: 'Andre Patel', kind: 'student', major: 'Electrical Engineering' },
    link_kind: 'resource',
    link_key: String(DEMO_RESOURCES[0].id),
    linked_record: { kind: 'resource', key: String(DEMO_RESOURCES[0].id), title: DEMO_RESOURCES[0].name, url: '', description: 'Fictional club fixture' },
  },
  {
    id: -3,
    body: 'Quiet study hour this weekend for anyone who wants to work alongside other students. Drop in when it fits your schedule.',
    version: 1,
    created_at: '2026-11-12T20:45:00Z',
    updated_at: '2026-11-12T20:45:00Z',
    author: { id: -103, name: 'Sam Rivera', kind: 'student', major: 'Industrial Design' },
    link_kind: 'event',
    link_key: DEMO_EVENTS[1].url,
    linked_record: eventLink(DEMO_EVENTS[1]),
  },
];

export function demoEventPostLink(eventUrl: string) {
  const event = DEMO_EVENTS.find((item) => item.url === eventUrl);
  return event ? eventLink(event) : null;
}

export function demoResourcePostLink(resourceId: string) {
  const resource = DEMO_RESOURCES.find((item) => String(item.id) === resourceId);
  return resource ? { kind: 'resource' as const, key: resourceId, title: resource.name, url: '', description: resource.kind } : null;
}
