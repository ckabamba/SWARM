export interface MobileProfile {
  name: string;
  kind: 'student' | 'alum';
  major: string;
  grad_year: number | null;
  introduction: string;
  profile_visible: boolean;
}

export interface MobileAccount {
  person_id: number;
  version: number;
  email: string;
  identity_verified: boolean;
  profile: MobileProfile;
}

export interface CommunityPost {
  id: number;
  body: string;
  version: number;
  created_at: string;
  updated_at: string;
  author: { id: number; name: string; kind: 'student' | 'alum'; major: string };
  link_kind: 'resource' | 'event' | null;
  link_key: string | null;
  linked_record: {
    kind: 'resource' | 'event';
    key: string;
    title: string;
    url: string;
    description?: string;
    source_url?: string;
    starts_at?: string;
    ends_at?: string;
    location?: string | null;
    organizer?: string | null;
    source?: string;
  } | null;
}

export interface PublicEvent {
  url: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  organizer: string | null;
  source: string;
}

export interface CommunityResource {
  id: number;
  name: string;
  kind: string;
}

export interface PublicProfile {
  person_id: number;
  profile: {
    name: string;
    kind: 'student' | 'alum';
    major: string;
    grad_year: number | null;
    introduction: string;
  };
  evidence: string;
  identity_verified: boolean;
}

export interface DiscoveryResource {
  id: number;
  name: string;
  kind: string;
  summary: string;
  url: string;
  source_url: string;
}

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

export class WarmPathApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'WarmPathApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE) {
    throw new WarmPathApiError(
      'Set EXPO_PUBLIC_API_BASE_URL to the WarmPath service address before connecting this mobile prototype.',
      0
    );
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new WarmPathApiError('WarmPath could not be reached. Check the service address and try again.', 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new WarmPathApiError(
      data?.error?.message || `WarmPath request failed (${response.status}).`,
      response.status
    );
  }
  return data as T;
}

const json = (value: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(value) });

export const warmPathApi = {
  me: () => request<MobileAccount>('/me'),
  signIn: (email: string, password: string) => request<MobileAccount>('/auth/login', json({ email, password })),
  register: (name: string, email: string, password: string) => request<MobileAccount>('/auth/register', json({ name, email, password })),
  signOut: () => request<{ status: string }>('/auth/logout', json({})),
  startWorkspace: () => request<{ goal: string }>('/session'),
  resources: () => request<{ items: DiscoveryResource[] }>('/resources'),
  events: () => request<{ items: PublicEvent[]; source: string; source_url: string; stale: boolean }>('/events'),
  communityOptions: () => request<{ resources: CommunityResource[] }>('/community/options'),
  posts: () => request<{ items: CommunityPost[]; next_cursor: number | null }>('/posts?limit=50'),
  publicProfile: (personId: number) => request<PublicProfile>(`/profiles/${personId}`),
  createPost: (body: string, linkKind: 'resource' | 'event' | null, linkKey: string | null, requestId: string) =>
    request<CommunityPost>('/posts', json({ body, link_kind: linkKind, link_key: linkKey, request_id: requestId })),
  updatePost: (postId: number, body: string, linkKind: 'resource' | 'event' | null, linkKey: string | null, version: number) =>
    request<CommunityPost>(`/posts/${postId}`, { method: 'PUT', body: JSON.stringify({ body, link_kind: linkKind, link_key: linkKey, version }) }),
  deletePost: (postId: number, version: number) =>
    request<{ status: string }>(`/posts/${postId}?version=${version}`, { method: 'DELETE' }),
};

export function newRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}
