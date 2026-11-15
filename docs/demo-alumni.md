# Synthetic alumni demo

`frontend/src/shared/demo-alumni.json` contains 1,000 fictional alumni, 40 at each of 25 companies. Names, affiliations, graduation years and histories are invented. `is_fixture` is true for every person. It contains no accounts, email addresses or real outreach targets and is never loaded into the connected database.

Regenerate with `python -m backend.seed.generate_demo_alumni`. Seed 20261115 makes it reproducible. Company-specific activity associations are deliberately planted for UI testing; the demo computes counts and lift from those generated memberships.

Build the separate demo with `VITE_DATA_SOURCE=fixture npm run build -- --outDir ../.local/demo-site` from `frontend/` (set the variable with PowerShell syntax on Windows). Serve that directory locally. The API-mode build and real profiles remain separate.

Example goals: **Software engineer at NVIDIA**, **Software engineer at Google**, **Software engineer at Microsoft**, **Software engineer at Apple**. Other companies include Amazon, Meta, Intel, AMD, Qualcomm, Cisco, IBM, Salesforce, Adobe, Oracle, Spotify, Uber, Airbnb, Stripe, Bloomberg, Capital One, JPMorgan Chase, Boeing, Lockheed Martin, SpaceX and Tesla. One company per query; unsupported or ambiguous company queries do not silently select another company.
