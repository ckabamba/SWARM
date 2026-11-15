# Social Jackets: connected community

Social Jackets at `/thermal/community.html` uses the same local FastAPI service, accounts and PostgreSQL database as Thermal. It preserves the incoming community dashboard and theme switch while replacing fictional posts and event fixtures with actual stored records. The old `/thermal/index.html#/community` route redirects here.

## Run and try it

From the repository root, with the local environment installed:

```powershell
.\.venv\Scripts\python.exe -m backend.manage start
.\.venv\Scripts\python.exe -m backend.manage migrate
.\.venv\Scripts\python.exe -m backend.manage run
```

Open **http://127.0.0.1:8000/thermal/community.html**. In My Profile, sign in or create an account and explicitly enable a public profile. Return to Social Jackets and share an update, optionally linking an existing campus resource or event. Reload or open another browser to see the stored post. Only its author can edit/delete it. Anonymous visitors can read public posts and open their authors' shared profiles.

Posts are public only while their author's profile is public. Withdrawing profile sharing hides those posts on subsequent reads; existing viewers must reload. Account deletion deletes its posts. Contacts, courses and experiences retain their individual visibility settings. Raw uploads and private fields are never included in posts. Account membership and histories remain self-reported: email/GT membership verification and password recovery are not implemented.

The events panel reads the same `/api/events` snapshots as resource discovery. Reloading it reads PostgreSQL; refresh the public sources with `python -m backend.api.sync_events`. Source links and stale warnings remain visible. An empty feed means nobody has published a visible post; there is no sample-content fallback.

## API contract

All paths below start with `/api`. Error bodies use the shared `{ "error": { "code": "...", "message": "..." } }` envelope. Writes require the existing same-origin account cookie; the server derives authorship, never a client-supplied author ID.

| Method and path | Request / response |
| --- | --- |
| `GET /posts?before=123&limit=20` | Public feed, newest ID first. `{items: Post[], next_cursor: integer or null}`; limit 1-50. Hidden/fixture authors are excluded before pagination. |
| `GET /posts/{id}` | One visible Post, otherwise 404. |
| `POST /posts` | `{body, request_id, link_kind?, link_key?}`; returns Post with 201. Requires an explicitly public profile. |
| `PUT /posts/{id}` | `{body, version, link_kind?, link_key?}`; replaces content/link and returns Post with incremented version. Author only. |
| `DELETE /posts/{id}?version=1` | Author only, expected version required; returns `{status: "deleted"}`. Also works after the author makes their profile private. |
| `GET /community/options` | Authenticated resource choices: `{resources: [{id, name, kind}]}`. Event choices come from `/events`. |

Post contains `id`, `body`, `version`, `created_at`, `updated_at`, `author: {id, name, kind, major}`, nullable `link_kind`/`link_key`, and nullable `linked_record`. Author IDs are shared person IDs and open through `/profiles/{id}`, which filters all private fields.

Body is trimmed plain text, 1-2000 characters. Both link fields must be present together or null. Kind is `resource` or `event`; key is the resource's decimal ID string or the event's source URL. The server validates that the record exists. Resolved resource links contain `kind`, `key`, `title`, `url`, `description`, `source_url`; event links contain `kind`, `key`, `title`, `url`, `starts_at`, `ends_at`, `location`, `organizer`, `source`. If a linked record later disappears, the post remains with `linked_record: null` and the UI reports it unavailable.

Creation requires a UUID `request_id`. A repeated request with the same author, ID and payload returns the existing post; a changed payload with that ID returns 409. The composer retains the ID for a failed request's retry. Edit/delete revisions reject stale writes with 409. Missing sessions return 401, private-profile publication 403, non-owner edits/deletes 404, invalid input/links 422, and throttled creates/edits 429 (30 attempts per 15 minutes per account).

## Storage and handoff

Migration `0004` extends role 1's shared `post` table with revisions, a resource/event reference, and unique per-author request IDs for safe retries. It retains the existing person foreign key and account-deletion cascade. The bounded local resource/event store still uses `api_resources` and `api_public_events`; links are validated in the API, not by foreign keys into those bootstrapped tables. A future move to shared resource/event tables must migrate these identifiers and update consumers together. No new database service, paid AI calls or AWS resources are required.

This slice implements text posts and public-source event highlights. Reactions, comments, follows, moderation tooling, club-authored event submission, geographic maps and Expo/React client integration remain outside this change.

## Verification

Run the API suite first against the isolated `warmpath_test` database:

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q
```

For browser checks, start the separate test server in another terminal, then run the check:

```powershell
.\.venv\Scripts\python.exe -m backend.tests.profile_server
# In another terminal:
.\.venv\Scripts\python.exe -m backend.tests.check_community
```

The browser check requires headless Microsoft Edge and internet for the existing CDN dependencies. It creates and deletes its synthetic test account in the test database. It verifies persistence across browsers/reloads, retry after a lost post response, private contact filtering, actual resource links, author edit/delete, theme switching, and profile/course/resource navigation without loading fixtures. API tests cover authorization, visibility withdrawal, version conflicts, validation, pagination and deletion cascades. Do not run the API suite concurrently with browser checks: test cleanup uses the same test database. Screenshots stay in ignored `.local/`.
