# WarmPath · Expo Go Mobile UI & Functional Spec

## 1. Environment & Expo Go Constraints (CRITICAL)
- Target runtime: **Expo Go** (React Native + TypeScript).
- **DO NOT use** DOM-only or custom-native-build packages that crash Expo Go (`react-dom`, `@react-three/fiber`, `@shadergradient/react`, raw HTML `<canvas>`, or CSS `backdrop-filter`).
- **Use only Expo Go-compatible packages**:
  - `react-native-svg` (hexagonal lattice, flat-topped hex nodes, cubic-bezier thermal strands)
  - `expo-linear-gradient` (thermal ambient glow + radial/vertical veil)
  - `expo-blur` (`BlurView` for frosted dark cards & bottom sheet)
  - `react-native-reanimated` & `react-native-gesture-handler` (60fps horizontal constellation pan, 3-detent bottom sheet, pulse rings)
  - `expo-haptics` (subtle tactile feedback on hex tap, lit-hex toggle, and sending an ask)
  - `@react-native-async-storage/async-storage` (persist student profile edits, lit hexes, asks, and preferences)

## 2. Visual & Design Tokens (Ported from `prototypes/thermal/index.html`)
- **Colors**:
  - `void`: `#06040b` (app background)
  - `panel`: `rgba(9, 6, 15, 0.84)` (cards, bottom sheet, top switch backdrop)
  - `ash`: `#8f8798` (secondary/quiet text, `.cap` labels)
  - `bone`: `#f4eee6` (primary body text)
  - `ember`: `#ff6a1f` (thermal strands, arrows `->`, input caret)
  - `gold`: `#eaaa00` (Georgia Tech Buzz Gold, warm hex lattice, mid-heat)
  - `glow`: `#ffe9a8` (hottest state: active buttons, lit hex strokes, accepted asks)
  - `tie`: `#f6cfa6` (shared alumni connection highlight text)
  - `line`: `rgba(244, 238, 230, 0.16)` (1px hairline borders)
- **Typography**:
  - Use `Mona Sans` if loaded via `expo-font`, otherwise clean system sans with `fontVariant: ['tabular-nums']`.
  - `.cap` label style: `fontSize: 10.5`, `letterSpacing: 1.8`, `textTransform: 'uppercase'`, `fontWeight: '500'`, color `ash`.
  - Editorial display headers: light weight (`300`–`400`), tight tracking (`-0.5` to `-1`).

## 3. Persistent Layered Architecture (`ThermalShell`)
Every screen sits inside a shared root container with fixed background layers:
1. **Layer 0 — Thermal Backdrop**: Deep `#06040b` base + subtle warm radial/linear `LinearGradient` (`#ff8a2a` / `#eaaa00` at low opacity `0.15–0.28`).
2. **Layer 1 — Persistent Hexagonal Constellation (`ThermalHexBackground`)**:
   - Rendered with `react-native-svg` using the flat-topped honeycomb lattice math (`HEX_R = 26`, `HEX_PATH` eased-corner hexagon).
   - **On Home (Profile)**: Faint gold honeycomb walls (`rgba(234, 170, 0, 0.14)`) + soft drifting thermal dust dots (`~45` animated SVG circles for mobile 60fps; respect Low-Battery mode). Toggling a "Lit Hex" chip subtly pulses a nearby hex cell.
   - **On Map**: Syncs horizontally (`translateX = -panX`) 1:1 with the pannable constellation stage so the hex grid, cubic-bezier strands, and DOM/UI nodes move together seamlessly.
3. **Layer 2 — Adaptive Veil**: Slightly darker radial/vertical scrim on Home (`rgba(6,4,11,0.86)` center) so text on frosted cards stays legible; lighter scrim on Map so strands shine.
4. **Layer 3 — Top Bar (`TopBar`)** (always visible, respects `SafeAreaInsets.top`):
   - Left: `● WarmPath` (`9px` `--glow` dot + title; tapping returns to Home).
   - Right: Segmented pill `[ Home | Map ]` with sliding `--glow` thumb (mirrors `.switch` from `index.html`).

## 4. Screen 1: Home (Profile Hub — Default Landing Screen)
Replaces the desktop landing page as the primary screen:
- **Student Identity Header**: Initials ring (`MP`), Name, Major + Ordinal Year (e.g. `Computer Science · 2nd year · Georgia Tech`), and `Edit` trigger (modal to edit major/year or switch between seeded demo students).
- **Active Goal Hero Card** (frosted `BlurView` + `1px` `line` border):
  - Shows active goal (`SWE Intern · Stripe`), `"14 alumni mapped · X of Y stops lit"`, a mini linear preview of lit/next/goal dots, primary `--glow` pill **`Open Constellation Map →`**, and **`+ New Goal`** link (opens a lightweight modal with input + `SEEDED_GOALS` suggestions).
- **Next For You / This Week Preview Card**:
  - Highlights `stop.next` (e.g., `VIP Embedded Interest · Thu 6:30p · Klaus 1443`). Tapping switches to `Map`, pans directly to that stop, and opens its Bottom Sheet.
- **Your Lit Hexes (Interactive Chips)**:
  - Lists stops on the path; tapping any chip toggles `stop.have` in local state (persisted via `AsyncStorage`), immediately recalculating `stop.next`, firing `Haptics.impactAsync`, and lighting up that hex on the Map.
- **Your Asks (Outbox)**:
  - Aggregates `asksByAlum(studentId)` into scannable cards (`Accepted a 15-minute call` in `--glow` vs `Sent · Waiting for reply` in `--ash`). Tapping a waiting ask opens the in-app **Alum Reply Demo Modal** (`ReplyScreen`) so stakeholders can test the full 1-tap accept flow.
- **Mobile Preferences**:
  - `Weekly event reminders` toggle (UI state)
  - `Low-battery thermal mode` toggle (disables background dust/pulse animations, mirroring `REDUCED`).

## 5. Screen 2: Map (Option B — Pannable Constellation + Bottom Sheet)
- **Virtual Horizontal Stage**:
  - Stage width `stageW = Math.max(screenWidth * 2.4, 920)` inside a horizontal `Animated.ScrollView` / pan container (`decelerationRate="fast"`).
  - Map `SPOTS` (`you`, `5`, `3`, `4`, `7`, `9`, `goal`) onto `stageW` and snap each stop onto the nearest honeycomb cell center (port `hexKey` + `place` logic).
  - Draw `STRANDS = 14` cubic-bezier routes (`dealStrands` + `mulberry(11)` PRNG) in `react-native-svg` using layered additive-style strokes (wide soft `#ff6a1f` glow at `0.18` opacity + crisp `#ffe9a8` core).
  - Each hex node has a minimum `48×48` touch target, scales by `achievers`, fills gold when `have === true`, and shows a dashed pulsing ring when `next === true`.
  - Auto-scroll on mount/open so `stop.next` (or `You`) starts centered in the upper viewport (`~42%` height above the peek sheet).
- **Draggable Bottom Sheet (`ConstellationSheet`)**:
  - Uses `react-native-gesture-handler` + `Reanimated` with 3 snap points: **Peek (~32%)**, **Half (~55%)**, **Expanded (~86%)**.
  - Top bar inside sheet has 3 mode pills: **`Stop Alumni` | `This Week` | `Closest Starts`**.
  - **`Stop Alumni`** (auto-selected when tapping any hex node): shows stop name, achiever count, upcoming event (`eventDay`), and up to 4 closest alumni (`shared_tie` in `#f6cfa6`, `Ask {FirstName}` pill).
  - **Inline Ask Composer**: Tapping `Ask {FirstName}` expands an inline `TextInput` pre-filled with `person.draft` (`Send the ask` + `Cancel`), updating `asks` state immediately.
  - **`This Week`** & **`Closest Starts`**: Replaces desktop's `.strip` and `.closest` corner overlays cleanly inside the sheet.

## 6. Screen 3: Alum Reply Demo Modal (`ReplyScreen`)
- Mirrors the desktop `#/reply/:id` view:
  - Centered single-column layout over the live hex background.
  - Shows `{student.name} would like 15 minutes of your time`, `What you share`, `{first}'s question`, and full-width `--glow` **`Accept a 15-minute call`** pill button.
  - Tapping accept calls `acceptAsk(id)`, triggers `Haptics.notificationAsync(Success)`, and immediately updates the Outbox on Home.

## 7. Data Layer (`src/data/warmPathApi.ts`)
- Port `shared/fake-api.js` cleanly to TypeScript with a reactive subscriber/Context/Zustand store + `AsyncStorage` persistence for `studentOverrides` (lit hexes, major/year, active goal) and `asks`.
