# My Courses and transcript import

Implemented locally in Thermal on `backend/thermal-local`. No push, cloud deployment, paid OCR or LLM call. Open **http://127.0.0.1:8000/thermal/#/courses** or use the **My Courses** navigation button. Sign in through My Profile first if needed.

## Course management

My Profile now contains general information, contacts, experiences and resume import. My Courses owns manual course editing, transcript import, history grouped by term, search, institution/status filters and related job topics. Deep links survive reload. Lists display 50 matching entries at a time with an explicit Show more control; all saved entries remain searchable.

Course records preserve institution, code/title, term, status, catalog resource link, sharing preference, stable ID, and source (`manual`, `resume`, `transcript`). Record type distinguishes coursework, transfer credit and exam/AP credit. Missing institution or term stays unknown. Status options include unspecified, planned, in progress, taken, and self-reported completed. Transcript rows do not imply passing or prerequisite completion; recognized in-progress sections can set in-progress status, while other rows remain unspecified until reviewed. No grade/GPA fields exist in the course contract.

Resume-imported courses appear on My Courses. Course visibility is individually controlled and still requires a public profile for public reads. Private courses are excluded from public profile responses. Course catalog links continue to support description-topic matching; counts and lift remain unavailable.

## Transcript workflow and limits

Upload a text-based PDF (5 MB maximum, 20 pages) or paste 20–50,000 characters. Extraction runs in the existing bounded subprocess for PDFs; no new dependencies were introduced. PDF files are temporary memory only. The transcript parser emits allowlisted course fields, page/line references, and generic review warnings. It does not retain full transcript text, grade columns, GPA, quality points, student identifiers or addresses as review evidence. Resume import remains a different workflow whose draft may include resume text.

The initial parser supports subject/number rows followed by titles and trailing grade/credit columns, term headings, and recognized transfer/exam/in-progress section headings. Grades are discarded and are never used to decide whether the student passed. Table layouts that cannot be separated safely can produce blank titles or warnings; scanned PDFs require pasted text/manual entry. This has been validated against synthetic multi-page documents, **not a real GT transcript sample**. The review screen explicitly asks users to compare every page, and does not claim completeness for arbitrary layouts.

Review, correct and select individual rows, or use Select all courses. Imports are atomic: a conflict, invalid row, or limit violation saves no partial batch and preserves the draft. The limits are 500 candidate rows per import and 1,000 saved course records per account, with explicit errors instead of truncation.

Duplicate identity uses normalized institution, course code (title when no code), term/session and record type. Course attempts in different terms remain separate. Exact matches with known institution and term skip the imported row and preserve existing edits/visibility. Ambiguous matches with missing institution/term require correction or an explicit Keep separate choice. Resume imports can also skip previously resume-imported matching entries; unresolved overlaps can be deselected and managed on My Courses. Changing a code or term can make an entry intentionally distinct; this is not fuzzy identity resolution.

Transcript drafts are owner-only, limited to five active drafts, expire after 24 hours, and are deleted on import/discard. Expiry uses the existing cleanup loop/startup cleanup. Uploaded text is parsed in memory and only the sanitized suggestions are stored. Account deletion cascades to courses and transcript drafts. PostgreSQL backups/WAL follow their own retention policy; no cloud backups were added.

## Migration and API contract changes

Run the explicit migration before starting the updated API:

```powershell
.\.venv\Scripts\python.exe -m backend.manage start
.\.venv\Scripts\python.exe -m backend.manage migrate
.\.venv\Scripts\python.exe -m backend.manage run
```

Migration `0003` adds `person_course` (one JSONB record per owned course), `transcript_draft`, and `person_profile.courses_version`. It moves existing profile courses into the new table, preserving IDs, source metadata, titles, terms, links and visibility, and removes the embedded `courses` array. Downgrade restores course records to the array before removing the new course table; transcript drafts are discarded on downgrade. New record types/source labels require a compatible client if rolling back; downgrade is not a promise of old-client semantic compatibility.

**Contract change:** `GET /api/me` no longer returns `profile.courses`; it includes top-level `courses_version`. `PUT /api/me` rejects embedded course writes, so stale profile clients cannot erase newer course changes. Courses have an independent collection revision; course writes do not increment the general profile version. All existing callers must use the updated contract.

| Endpoint | Request / response |
| --- | --- |
| `GET /api/me/courses` | `{version,items,total}`; all owned courses, maximum 1,000 |
| `POST /api/me/courses` | `{version,course}`; server assigns ID/manual provenance; returns collection, 201 |
| `PUT /api/me/courses/{id}` | `{version,course}`; preserves existing ID/provenance; returns collection |
| `DELETE /api/me/courses/{id}?version=N` | Removes only the owner's course; returns collection |
| `POST /api/transcripts` | Raw PDF bytes, `application/octet-stream`; no original filename needed; returns sanitized draft, 201 |
| `POST /api/transcripts/text` | `{text}`; returns sanitized draft, 201 |
| `GET /api/transcripts` | Own unexpired draft IDs/expiries |
| `GET /api/transcripts/{id}` | Draft candidates plus possible existing duplicate IDs; no raw text or grades |
| `DELETE /api/transcripts/{id}` | Owner-scoped idempotent discard |
| `POST /api/transcripts/{id}/import` | `{version,selections:[{id,course,confirm_separate}]}`; atomic reviewed import; returns collection and `duplicates_skipped` |

Resume imports selecting courses now require `{version,courses_version,selections}`. They atomically update the shared course table and general profile. Public profiles and `/me/matches` read that same table. Existing 401/403/404/409/413/422/429 error envelopes apply. Source/grade/GPA fields cannot be injected through unknown properties; course provenance is server-controlled. Models live in `backend/api/profile_models.py`.

## Verification

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q
# Run in one terminal (isolated warmpath_test database, port 8001):
.\.venv\Scripts\python.exe -m backend.tests.profile_server
# Run in a second terminal:
.\.venv\Scripts\python.exe -m backend.tests.check_courses
.\.venv\Scripts\python.exe -m backend.tests.check_profiles
# Existing resources against the normal port-8000 server:
.\.venv\Scripts\python.exe -m backend.tests.check_thermal
```

Tests use synthetic documents only. Coverage includes migration/backfill/downgrade preservation, grades absent from persisted drafts, multi-page extraction, repeat terms, transfer/exam/in-progress classification, ambiguous duplicates, atomic conflicts, profile/course save independence, ownership and sharing, expiry/account deletion, resume compatibility, manual edits and the browser import workflow. CDN-dependent browser checks need network access. The local database remains PostgreSQL 17; team PostgreSQL 18 verification remains outstanding. AWS spending remains zero for this feature.
