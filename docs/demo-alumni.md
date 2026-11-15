# Synthetic alumni demo

`frontend/src/shared/demo-alumni.json` contains 1,000 fictional alumni, 40 at each of 25 companies. Names, affiliations, graduation years and histories are invented. `is_fixture` is true for every person. It contains no accounts, email addresses or real outreach targets and can be explicitly loaded into the local database for a labeled demo.

Regenerate with `python -m backend.seed.generate_demo_alumni`. Seed 20261115 makes it reproducible. Company-specific activity associations are deliberately planted for UI testing; the demo computes counts and lift from those generated memberships.

Build the separate demo with `VITE_DATA_SOURCE=fixture npm run build -- --outDir ../.local/demo-site` from `frontend/` (set the variable with PowerShell syntax on Windows). Serve that directory locally. The API-mode build and real profiles remain separate.

Example goals: **Software engineer at NVIDIA**, **Software engineer at Google**, **Software engineer at Microsoft**, **Software engineer at Apple**. Other companies include Amazon, Meta, Intel, AMD, Qualcomm, Cisco, IBM, Salesforce, Adobe, Oracle, Spotify, Uber, Airbnb, Stripe, Bloomberg, Capital One, JPMorgan Chase, Boeing, Lockheed Martin, SpaceX and Tesla. One company per query; unsupported or ambiguous company queries do not silently select another company.


## Temporary local database mode

The user authorized loading the generated profiles into the local development database. Run `python -m backend.seed.load_demo_alumni` once; it refuses duplicate loads and remote databases, sets every generated record's fixture flag, and preserves existing accounts. It does not reset the database. Set `WARMPATH_DEMO_HISTORIES=1` in your ignored root `.env` and restart the API. The API-mode map displays a synthetic-data label. Remove that setting (or set it to `0`) and restart to exclude the fixtures again without deleting anyone. Synthetic people have no login accounts and cannot receive asks. Private real histories remain excluded in both modes.


## Synthetic course histories

Each generated alum has introductory courses plus a reproducible mix of the eight catalog courses (resource IDs 101?108). Company-group preferences are deliberately invented to exercise ranking, not claims about hiring or real attendance. Memberships occur before the synthetic job in year 5. Common courses need not appear as path stops because their lift is low; more concentrated course histories can qualify under the existing three-achiever and 1.5-lift thresholds.

For an already loaded dataset, run `python -m backend.seed.load_demo_alumni --courses-only`. It checks generated identities, retains person IDs, links fixture course activities to existing resources, and upserts memberships without duplicating them. New loads include courses automatically. The alumni drawer lists earlier courses and links to catalog sources. Background dots are ambient decoration, independent of alumni counts, and remain still with reduced motion.
