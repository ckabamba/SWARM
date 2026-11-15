# Local profiles and resume import

**Course separation update:** classes now live on [My Courses](courses-and-transcripts.md). Migration `0003` preserves existing records while moving them out of the profile document. `/me` no longer returns or accepts `profile.courses`; course CRUD uses `/me/courses`, and resume imports selecting courses also require `courses_version`. The transcript workflow has its own parser/drafts and retains no raw transcript text or grades. The resume-specific behavior below otherwise remains applicable.

Implemented on `backend/thermal-local`. Thermal's **My Profile** button opens local accounts, manual profile editing, and reviewed resume import. No cloud services, paid model calls, or remote issue changes. The new React/Vite port and Expo have not yet been connected.

## User flow

Create an account or sign in with an email and password (12–128 characters). This authenticates an account, not email ownership or Georgia Tech membership. Profiles and contacts start private. Anonymous resource saves remain separate from the account.

Add/edit/remove contact details, jobs, internships, research, VIP, clubs, projects and volunteering on My Profile. Classes are managed separately on My Courses. Experience dates remain `YYYY` or `YYYY-MM`; no invented days. Save explicitly. A version prevents stale tabs from overwriting newer changes: 409 responses preserve unsaved UI edits for reconciliation.

Upload a PDF/DOCX (5 MB maximum, 20 PDF pages) or paste text. A conservative local parser suggests name, explicitly labeled major/graduation year, contacts, course codes/titles and section-based experiences. Complex layouts and unfamiliar headings can require manual entry. Each suggestion shows source text. Nothing is selected automatically. Users edit/select entries before importing. Selected scalar fields explicitly replace their values; collections append while duplicates preserve existing entries. Differing titles/dates can still require manual duplicate removal.

Raw uploaded bytes are never written to disk/database. Extraction runs in a separate process with a 15-second timeout and 384 MB memory limit. DOCX expansion/XML declarations/macros and PDF encryption/page counts are checked. At most two parsers run per API worker. This bounds processing but is not a general malware sandbox. No OCR, LLM, remote URL fetch or LinkedIn import occurs. Scanned/unreadable documents offer pasted text/manual entry.

Extracted text/suggestions are private PostgreSQL drafts, inaccessible after 24 hours. Cleanup runs every five minutes while the API runs and on startup/draft list/create. Import/discard deletes draft text. Limits: five active drafts per account, ten import attempts per 15 minutes. Saved entries retain a source label and opaque ID, not raw source text. Account deletion cascades to profile, drafts, sessions and associated shared-schema posts. Database backups/WAL may retain previous data until their retention expires; no cloud backups were provisioned.

## Sharing and evidence

Public profile reads return only explicitly public profiles and individually shared entries. Account email is never automatically published. Imported collection entries start private even on a public profile. Enabling a public profile shares basic name, kind, major, graduation year and introduction; contacts/classes/experiences have separate toggles. Withdrawing profile visibility immediately makes the public endpoint return 404.

City selection references role 1's `alumni_city` IDs; the local catalog currently has none. City sharing becomes usable when normalized real cities are supplied. No home address/city is inferred from resumes.

Users explicitly link classes/VIP experiences to sourced campus resources. Saved links can produce job-topic matches from catalog descriptions. These do not verify personal skills, attendance, employment or eligibility. Counts/lift remain null, and profiles do not automatically enter alumni statistics.

## Schema and setup

Migration `0002` extends `0001` without modifying it. It references `person` and adds `account`, `account_session`, `person_profile`, `resume_draft` and `account_rate_limit`. Profile collections use validated JSONB with stable entry IDs and versioned atomic updates. Future statistics should use agreed normalized participation records. The API reflects shared tables instead of creating them at worker startup.

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
.\.venv\Scripts\python.exe -m backend.manage start
.\.venv\Scripts\python.exe -m backend.manage migrate
.\.venv\Scripts\python.exe -m backend.manage run
```

The installed local database remains PostgreSQL 17.12; incoming team Compose/RDS targets PostgreSQL 18. Migrations use features supported by both, but execution has been verified on local 17 only. No existing database files were replaced and no RDS database was touched. PostgreSQL 18 verification/version alignment remains a deployment prerequisite.

## API contract

All routes use prefix `/api`. Authenticated routes derive ownership from the server session, never a submitted person ID. See executable models in `backend/api/profile_models.py` and OpenAPI `/docs`.

| Routes | Contract |
| --- | --- |
| `POST /auth/register` | `{email,password,name}` → private profile/session; 201 |
| `POST /auth/login`, `POST /auth/logout` | Credentials for login; logout revokes current session |
| `GET /me` | `{person_id,email,version,profile,identity_verified:false}` |
| `PUT /me` | `{version,profile}` → validated replacement and incremented version |
| `DELETE /me` | Deletes own account/profile/drafts/sessions |
| `GET /profile-options` | Course/VIP references and normalized cities |
| `GET /profiles/{person_id}` | Filtered public self-reported profile; hidden/unknown: 404 |
| `GET /me/matches` | Saved resource links compared with job-description topics; counts/lift null |
| `POST /resumes?filename=resume.pdf` | Raw `application/octet-stream` bytes → draft ID, expiry, extracted text, warnings and candidates; 201 |
| `POST /resumes/text` | `{text}` (20–50,000 characters) → same draft response |
| `GET /resumes`, `GET /resumes/{id}` | Own unexpired list/detail; no public resume download |
| `DELETE /resumes/{id}` | Owner-scoped idempotent discard |
| `POST /resumes/{id}/import` | `{version,selections:[{id,value}]}` → atomic profile update/draft deletion; response includes `duplicates_skipped` |

Candidate sections: `name`, `major`, `grad_year`, `contacts`, `experiences`, `courses`. Every candidate includes ID, editable value and source evidence. Unknown fields are rejected. Manual edits cannot fabricate resume provenance. Errors use `{error:{code,message}}`, including 401/403/404/409/413/422/429/503. Never log passwords or resume/draft bodies.

Salted scrypt protects passwords (N=131072, r=8, p=1). Random session tokens are stored only as hashes; cookies are HttpOnly, SameSite=Strict, seven-day expiry and Secure under HTTPS. Origin checks reject cross-origin writes. Login/registration/import limits persist in PostgreSQL. The server binds to loopback. Production identity-provider selection, verified email/GT membership, recovery, HTTPS configuration and operational review remain outstanding; do not expose this local build as a production authentication service.

## Verification

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q
# Dedicated test DB server in one terminal:
.\.venv\Scripts\python.exe -m backend.tests.profile_server
# Browser test in another terminal:
.\.venv\Scripts\python.exe -m backend.tests.check_profiles
# Existing resource workflow with the dev server on port 8000:
.\.venv\Scripts\python.exe -m backend.tests.check_thermal
```

Synthetic profiles/documents remain in `warmpath_test`; the browser test cleans up its account. Browser checks require Edge and internet for existing CDN dependencies. Tests cover isolation, session revocation, visibility, conflicts, reviewed import, duplicate preservation, partial dates, parser errors, expiry/deletion and UI persistence. Screenshots stay in ignored `.local/`. Test server: 8001; normal server: 8000.

No AWS spend is needed. OCR, LLM processing and production file storage were not provisioned. Continue using the $100-total budget policy before cloud work.
