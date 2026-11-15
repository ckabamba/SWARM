# Campus resource expansion - November 15, 2026

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

RDS load verified: 32 resources, two job examples, 68 events, zero people and zero accounts. Existing event rows were compared by a content digest and remained unchanged. No migration, account or participation writes occurred. The local backend still uses its existing database configuration; importing a catalog does not deploy the API or resolve the separate migration mismatch.
