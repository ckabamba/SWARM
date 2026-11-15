# WarmPath Expo prototype

The app opens to sign in or account creation before showing its tabs. A clearly labeled **Continue with Demo** button bypasses sign-in and opens fictional, session-local student profiles, posts, clubs, and events. Demo posts and edits stay in memory for the app session and never go to the service. The normal signed-in Social Jackets, Discovery, and account screens connect to the existing WarmPath service and do not mix in fixture posts.

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL` to the API origin plus `/api`. For an Android emulator, `http://10.0.2.2:8000/api` reaches a service running on the host. On a physical phone, use the development computer's LAN address. The service and phone must be able to reach each other.

Sign-in, registration, post publishing, editing, and deletion use the existing account and community endpoints and their cookie session. Community posts can link to a current sourced event or resource. Campus events remain read-only records from the existing public source sync. The app shows a clear empty/error state when records or the service are unavailable; it does not substitute sample people, posts, events, or map markers.

The Maps tab remains a placeholder until the geographic map view is implemented. Paths and Ask remain the existing Thermal prototype flow.
