# Resource relevance and alumni evidence

Decision recorded November 14, 2026: include course and VIP information even without verified alumni attendance. A course or project can be useful because its published topics overlap a goal or job listing. This is separate from alumni-path evidence.

## Implemented description matching

The local catalog now includes eight CS courses from the [official Georgia Tech catalog](https://catalog.gatech.edu/coursesaz/cs/) and three project-level entries from [LIDAR's VIP page](https://lab-idar.gatech.edu/vip/), in addition to the original seven campus resources.

Course coverage: CS 1331, 1332, 2200, 3210, 3600, 3630, 4641, and 4476. VIP entries cover quadrupedal navigation, tactile navigation, and clinical manipulation. Titles, short paraphrases, topics, access notes, sources, and check dates are stored locally. This is a curated starting catalog, not every GT course or VIP team. Term offerings, prerequisites, credit restrictions, and project openings must be checked at the official sources. VIP-listed skills may be prerequisites or preferred experience; they are not automatically promised learning outcomes.

Two public employer descriptions are recorded in `backend/api/job_examples.json`: NVIDIA's 2027 Software Engineering internship umbrella listing (JR2023495) and its AI/DL Kernel Libraries internship (JR2026307, Shanghai). Each has its original employer URL, location/context, a short summary, selected topics, and a check date. They are reviewed snapshots, not a live or exhaustive jobs feed; a matching result does not confirm the vacancy is still open. The umbrella listing's topic needs vary by team.

Topic labels are manually normalized from each description. For example, OOP becomes `object-oriented programming`, and systems-software coverage can map to `computer systems`. SQL counts shared labels to order up to five resources for a selected job. Responses list the actual shared labels and both source links. Matching is deterministic and uses no model. It is a partial relevance signal, not a score for hiring probability, a full skills assessment, employer endorsement, or proof that the course supplies every requirement.

| Evidence basis | Permitted statement | What it cannot establish |
| --- | --- | --- |
| Course catalog | This course covers operating-system concepts | A named alum enrolled, passed, or benefited professionally |
| VIP description | This project involves navigation and lists Python | A named alum participated; every listed skill is taught |
| Job description | The employer lists operating-system knowledge for some roles | This particular course qualifies the student or guarantees an interview |
| Description topic overlap | The course/project and listing share these topics | Alumni-path lift, attendance counts, or causal outcomes |
| Authorized alumni histories (not available yet) | Supported participation/outcome counts within a defined cohort | Causality from observational association |

`POST /api/path` still returns null achievers/lift and unavailable alumni evidence even when a job match is strong. Resource saves mean bookmarks, not completed courses or participation. Actual alumni paths still need provenance, permission/visibility, chronological activities/outcomes, and a defined statistical population.

## LinkedIn decision

No LinkedIn alumni data is imported or scraped. The user authorized its use only if legally sound; the current information does not establish a permitted bulk-data route for this project. This is an implementation decision based on documented access terms, not a legal opinion about every possible collection method.

LinkedIn's [User Agreement, sections 8.2.2–8.2.4](https://www.linkedin.com/legal/user-agreement) prohibits unauthorized automated copying/scraping and restricts reuse, including information obtained indirectly through third parties. Public visibility alone is not our basis for bulk collection. A broker or search engine is not an automatic workaround.

The standard [Sign In with LinkedIn OpenID Connect API](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2) supplies limited information about the consenting member, such as name/profile picture and optionally email. It does not supply a GT alumni directory, course records, full career histories, or proof of GT graduation. LinkedIn explicitly says this sign-in product should not be marketed as identity verification.

Potential future routes:

- A LinkedIn-approved agreement/product whose permitted fields and uses actually cover our alumni feature. Check contractual scope, applicable privacy obligations, retention, and redistribution before importing data.
- Optional LinkedIn sign-in for the member's permitted basic fields after app approval/configuration. It would not fill the missing alumni-history dataset.
- Alumni directly contribute their own education, activities, work history, and shared city to WarmPath, with clear visibility and withdrawal/deletion controls. Treat self-reported claims accordingly; do not label them independently verified by LinkedIn.

LinkedIn's [API terms](https://www.linkedin.com/legal/l/api-terms-of-use) require informed consent for relevant access, including explaining collection/use and withdrawal/deletion. Consent alone does not expand the API permissions or authorize restricted bulk scraping. No LinkedIn account, paid provider, or external data purchase has been configured for this work.
