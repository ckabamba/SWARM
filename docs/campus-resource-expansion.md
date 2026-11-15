# Campus resource expansion - November 15, 2026

## Imported courses and VIP teams

`python -m backend.api.gt_catalog_import` rebuilds `backend/api/gt_catalog.json` from two official pages, and `init-catalog` loads that file with the curated catalog. The API never fetches these pages. The import on November 15, 2026 added 365 resources, for 397 in total:

| Kind | Rows | Source | Resource IDs |
| --- | --- | --- | --- |
| CS courses numbered 1000-4999 | 119 | [catalog.gatech.edu/coursesaz/cs](https://catalog.gatech.edu/coursesaz/cs/) | 1,010,000 + course number |
| ECE courses numbered 1000-4999 | 139 | [catalog.gatech.edu/coursesaz/ece](https://catalog.gatech.edu/coursesaz/ece/) | 1,020,000 + course number |
| VIP teams | 107 | [vip.gatech.edu/teams](https://vip.gatech.edu/teams/) | 2,000,000 + the team's entry number |

- **What a row holds:** the published title and description (shortened at a sentence end), the source URL, an access note and the import date. Thirty-three courses have no catalog description and say so.
- **Left out on purpose:** graduate courses, `1XXX`-style elective placeholders, the eight CS courses already curated in `curriculum.json` (so every course code appears once and transcript matching stays unambiguous), credit hours and prerequisites, and for VIP teams the hidden search text (it can name people), images, meeting times and application details.
- **Topics:** a row gets a topic only when a phrase already used by the curated courses or job examples appears in its published description; 65 rows have any. The importer adds no new topics. Job matching still labels these as description overlap, not qualification.
- **What it does not show:** that a course is offered this term, that a team has openings, or that any alum took part.
- **Adding a subject:** add it to `SUBJECTS` with its own ID block, rerun the import, review the diff, then run `init-catalog`. The course and VIP pickers are plain dropdowns, so a much larger catalog needs search and paging first.

Both sites allow these pages in `robots.txt`; the import reads each page once per run.

## Curated resources

Fourteen resources were added to the existing catalog, bringing the combined campus/course/VIP total to 32. Sources are official Georgia Tech pages. Each record stores its source URL, checked date, access guidance and search tags. These descriptions do not establish alumni participation or outcomes. Program availability and eligibility must be checked at the linked source; no application deadlines or live availability are inferred.

Some source sites could be read through indexed official-page results while live requests timed out (Invention Studio, tutoring, coaching and Campus Closet). Campus Closet is supported by STAR's official program listing. The source-check date records content review, not guaranteed service availability.

| Resource | Official source |
| --- | --- |
| Undergraduate Research Opportunities Program | [Source](https://experiential.learning.gatech.edu/urop/) |
| PairMe Research Opportunities | [Source](https://pairme.aep.gatech.edu/) |
| Undergraduate Research Option | [Source](https://experiential.learning.gatech.edu/urop/research-option/) |
| Naugle Writing and Communication Center | [Source](https://communicationcenter.gatech.edu/what-we-do) |
| Flowers Invention Studio | [Source](https://inventionstudio.gatech.edu/) |
| 1-to-1 Tutoring | [Source](https://www.success.gatech.edu/tutoring/1-to-1-tutoring/) |
| Academic Coaching | [Source](https://www.success.gatech.edu/retention/academic-coaching/) |
| Library Media Scholarship Commons | [Source](https://library.gatech.edu/spaces-technology/media-scholarship-commons) |
| Library Data Visualization Services | [Source](https://library.gatech.edu/vizlab) |
| Library Gadgets and Equipment Lending | [Source](https://library.gatech.edu/spaces-technology/gadgets) |
| Library Research Experts | [Source](https://library.gatech.edu/research-help-support/research-experts) |
| STAR Services | [Source](https://star.studentlife.gatech.edu/) |
| Klemis Kitchen | [Source](https://star.studentlife.gatech.edu/klemis-kitchen) |
| Campus Closet | [Source](https://star.studentlife.gatech.edu/) |

The catalog IDs 301-314 are new, preserving all existing resource and curriculum IDs. The loader rejects duplicate IDs before importing, and its existing upsert behavior makes repeat loads idempotent. Catalog/API tests passed (9 tests).

RDS load verified: 32 resources, two job examples, 68 events, zero people and zero accounts. Existing event rows were compared by a content digest and remained unchanged. No migration, account or participation writes occurred. The local backend still uses its existing database configuration; importing a catalog does not deploy the API or apply the pending history/ask migrations 0009/0010.
