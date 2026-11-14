---
name: WarmPath
description: A shared visual language for WarmPath resource discovery, community, and geographic maps on web and mobile.
colors:
  void: "#06040b"
  bone: "#f4eee6"
  ash: "#8f8798"
  glow: "#ffe9a8"
  glow-hover: "#fff5d3"
  gold: "#eaaa00"
  gold-deep: "#8f5c00"
  ember: "#ff6a1f"
  tie: "#f6cfa6"
  line: "rgba(244, 238, 230, 0.16)"
  panel: "rgba(9, 6, 15, 0.84)"
  fog-orange: "#ff8a2a"
  fog-amber: "#ee9b00"
  fog-navy: "#050c1c"
typography:
  display:
    fontFamily: "'Mona Sans', system-ui, sans-serif"
    fontSize: "clamp(32px, 4.3vw, 64px)"
    fontWeight: 300
    lineHeight: 1.08
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 108"
  headline:
    fontFamily: "'Mona Sans', system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 106"
  title:
    fontFamily: "'Mona Sans', system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.005em"
    fontVariation: "'wdth' 105"
  body:
    fontFamily: "'Mona Sans', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Mona Sans', system-ui, sans-serif"
    fontSize: "10.5px"
    fontWeight: 500
    letterSpacing: "0.16em"
    fontVariation: "'wdth' 118"
rounded:
  pill: "999px"
  field: "12px"
  message: "14px"
spacing:
  hair: "8px"
  row: "18px"
  panel: "34px"
  gutter: "40px"
components:
  button-primary:
    backgroundColor: "{colors.glow}"
    textColor: "{colors.void}"
    rounded: "{rounded.pill}"
    padding: "9px 18px"
  button-primary-hover:
    backgroundColor: "{colors.glow-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.bone}"
    rounded: "{rounded.pill}"
    padding: "9px 18px"
  button-accept:
    backgroundColor: "{colors.glow}"
    textColor: "{colors.void}"
    rounded: "{rounded.pill}"
    padding: "20px"
  switch:
    backgroundColor: "rgba(9, 6, 15, 0.6)"
    textColor: "{colors.ash}"
    rounded: "{rounded.pill}"
    padding: "4px"
  switch-selected:
    backgroundColor: "{colors.glow}"
    textColor: "{colors.void}"
  input-goal:
    backgroundColor: "transparent"
    textColor: "{colors.bone}"
    typography: "{typography.display}"
  textarea-draft:
    backgroundColor: "rgba(244, 238, 230, 0.04)"
    textColor: "{colors.bone}"
    rounded: "{rounded.field}"
    padding: "14px 16px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.bone}"
    padding: "96px 34px 34px"
    width: "min(460px, 92vw)"
---

# Design System: WarmPath

This file sets the visual theme for the WarmPath front end. Read it before building or changing any screen. The token values in the frontmatter above are the source of truth; the prose below explains where and why each one is used.

The system is taken from the working prototype at [prototypes/thermal/index.html](prototypes/thermal/index.html). When this file and the prototype disagree, treat this file as the rule and say so in your pull request. The product rules that govern wording and scope are in [AGENTS.md](AGENTS.md) and are not repeated here.

## Overview

**Creative North Star: "The Warm Hive"**

WarmPath connects Georgia Tech students and alumni through paths/resource discovery, community posts and events, and geographic maps of campus activities and alumni cities. The shared theme is a dark honeycomb with warm yellow selections, restrained gold and ember accents, and pill controls. In the alumni-path view, each alum who reached a goal is a glowing strand; shared routes burn brighter. Across other views, brightness represents a meaningful count or interaction state.

The feel is a quiet, near-black field with a few bright things in it. Colour sits at the edges as slow amber fog, the centre stays dark so type and routes read, and the interface itself is small: hairlines, pills and one size of tracked caps. The reference for mood is Active Theory's site: one object in a dark room, minimal chrome anchored to the corners.

**Key Characteristics:**

- Near-black ground, with gold and ember as the only chromatic colours.
- Flat-topped honeycomb geometry for the path view and brand surfaces; keep feed content and geographic basemaps readable.
- Brightness encodes a count or a state. It is never decoration.
- Thin interface chrome and consistent navigation; each experience gets the layout its content needs.
- Motion is one authored moment per screen, then stillness.

### Motion

Motion follows three rules, in this order.

1. **Decide whether it should move at all.** Things seen constantly (the lattice, list rows, the top bar) do not animate on their own. Things seen once per session (the route drawing, the landing lines) can take their time.
2. **Use the three easing curves and nothing else.** Enter and exit: `cubic-bezier(0.23, 1, 0.32, 1)`. Moving on screen: `cubic-bezier(0.77, 0, 0.175, 1)`. Drawers: `cubic-bezier(0.32, 0.72, 0, 1)`. Never `ease-in`.
3. **Animate `transform` and `opacity`.** The two exceptions in use are `filter: blur()` on the landing word reveal and `grid-template-rows` on the draft box.

Durations in use: press feedback 160ms, hover 200ms, switch thumb 320ms, drawer open 460ms and close 240ms (exits are faster than entrances), draft box 260ms, state crossfade 500ms. Stagger lists by 45 to 85ms per item. Gate hover effects behind `@media (hover: hover) and (pointer: fine)`. Under `prefers-reduced-motion`, drop movement and idle loops, keep fades at 150ms, and show finished states at once.

## Colors

A near-black violet ground, warm off-white type, and a heat ramp that runs navy, gold, amber, pale yellow.

### Primary

- **Glow** (`colors.glow`): the hottest value. Primary buttons, the selected switch segment, the edge of a checkpoint you have or should take next, state labels, focus outlines. If something is the next thing to press, it is this colour.
- **Buzz Gold** (`colors.gold`): Georgia Tech's gold, used exactly. The fill of lit checkpoints and of honeycomb cells on a route. `colors.gold-deep` is only the outer stop of that fill's gradient.

### Secondary

- **Ember** (`colors.ember`): the strands themselves, the text caret, the `->` prefix on arrow links, text selection. Never a fill for controls.

### Tertiary

- **Fog** (`colors.fog-orange`, `colors.fog-amber`, `colors.fog-navy`): the three colours of the animated backdrop gradient, and nothing else. The amber is slightly redder than Buzz Gold on purpose, because dark Buzz Gold reads olive.

### Neutral

- **Void** (`colors.void`): page ground, and text on Glow surfaces.
- **Bone** (`colors.bone`): all primary text.
- **Ash** (`colors.ash`): secondary text, captions, unselected controls. It passes 4.5:1 on Void; do not go dimmer for text.
- **Tie** (`colors.tie`): the shared-tie sentence in the people panel and reply page, and only that.
- **Line** (`colors.line`): every hairline and control border.
- **Panel** (`colors.panel`): the people drawer surface.

### Named Rules

**The Heat Is Data Rule.** Gold fill and added brightness appear only where they mean something: a stop the student has, the number of alumni on a stretch of route, an accepted ask. If you cannot say what a glow counts, remove it.

**The Dark Centre Rule.** Colour lives at the edges of the screen. A dark radial veil sits over the backdrop so the middle 75% stays near Void. Do not place saturated colour behind text.

**The No Rose Rule.** There is no pink, magenta or purple anywhere. The cold end of the heat ramp is navy.

## Typography

**Display Font:** Mona Sans, variable width and weight (with system-ui)
**Body Font:** Mona Sans
**Label Font:** Mona Sans, expanded

**Character:** One family doing three jobs through its width axis: light and slightly wide for big lines, normal for reading, expanded and tracked for labels. It reads technical without leaning on a monospace.

### Hierarchy

- **Display** (300, `clamp(32px, 4.3vw, 64px)`, 1.08): landing lines and the goal field. The goal field may run up to 76px. Maximum width about 10.5em so lines break in three.
- **Headline** (400, 26px, 1.15): the people panel title. The reply page headline uses 34px at weight 300.
- **Title** (500, 17px, 1.2): checkpoint names and person names (person names at 600). The goal checkpoint uses 21px.
- **Body** (400, 15px, 1.5): everything else. Supporting lines drop to 13.5 or 14px. Keep paragraphs under 40 characters wide inside the panel.
- **Label** (500, 10.5px, 0.16em tracking, uppercase, width 118): section captions, state labels, the student switch, arrow links.

Set `font-variant-numeric: tabular-nums` on the body so counts line up.

### Named Rules

**The One Label Rule.** There is exactly one small-caps style. Do not introduce a second label size, a monospace, or bold caps.

**The Light Display Rule.** Large type is weight 300. Emphasis at display size comes from size and position, never from bold or gradient text.

## Layout

All three core experiences support web and mobile. Preserve the existing colors, typography, pill controls, focus states, and reduced-motion behavior across layouts. The delivery technology for mobile remains undecided; responsive and touch-friendly design is required regardless.

The following desktop path layout is a starting point from the prototype, not a rule for every screen. Community feeds and resource lists can scroll normally. Maps use a bounded interactive area with accessible details. Use the 40px gutter (`spacing.gutter`) where space allows and reduce it on small screens:

Desktop path layout:

- Top left: wordmark. Top right: student switch.
- Bottom left: "This week on your path". Bottom right: "Closest starts to yours".
- The map takes the space between, with 100px reserved at the top and 176px at the bottom.

On desktop, the people panel is a drawer on the right edge, `min(460px, 92vw)` wide. On mobile, use a readable sheet or detail page that does not hide essential controls or clip text.

For the path visualization, layers stack in this order, back to front: animated backdrop, dark veil, 3D honeycomb model (landing only), honeycomb lattice with strands and alumni dots, then the interface. The lattice layer is blended with `mix-blend-mode: screen` so it only ever adds light.

Lists can use rows separated by hairlines, with 8px vertical padding in compact lists and 18px in panels. Community posts and event highlights may use grouped surfaces or cards with the existing colors, radii, and borders; choose the structure for readability.

### Community layout

Provide a scrollable stream of LinkedIn-style student/alumni posts with clear author identity and content. Give club activities and campus-event highlights a distinct section. On small screens, stack these sections in a deliberate reading order. Links open the same profile, club, event, or resource records used in discovery and maps. Reactions, comments, follows, and private messaging remain undecided.

### Geographic maps

Provide campus and alumni-city views within the geographic-map experience. Campus markers identify real activity/event locations. Alumni markers represent shared cities, with a way to explore the relevant people. City counts and company/industry/major/shared-club filters are proposed details. Position geographic markers by coordinates, not by the decorative honeycomb grid. Basemap and marker geometry can differ from path checkpoints.

Use selected-state styling consistent with the yellow pill controls. Details must be accessible through touch and keyboard controls; provide an accompanying list or equivalent access to location results. Mobile layouts should keep map controls and details usable without hover.

### Text and voice

Keep text entry available alongside voice access. Define visible listening, processing, and failure states once the voice interaction is specified. Make it possible to stop recording and return to text. Spoken output behavior is undecided; resource results must remain readable and actionable on screen.

### Mobile behavior

Use readable single-column content where needed, touch-friendly targets, and navigation between discovery, community, and maps. Allow map pan/zoom without interfering with surrounding page scrolling. Adapt drawers, labels, and long posts to narrow screens. Verify the flows on both desktop and phone-sized displays; do not restrict mobile support to the reply page.

## Elevation & Depth

There are no shadows. Depth comes from the layer order above, from additive light, and from one blur: the people panel uses `backdrop-filter: blur(22px)` so the moving map behind it does not fight the text. That blur is the only one, and it exists for legibility.

### Named Rules

**The No Halo Rule.** No `box-shadow` or `text-shadow` glow, on anything. A lit checkpoint is lit by its fill, and a route by its strands.

## Shapes

The existing path view uses three primary forms. Extend them consistently for community content and geographic maps:

- **Hexagons, flat-topped.** The lattice cell is 26px from centre to corner. Checkpoints are the same shape with slightly eased corners, drawn as SVG with a 1px non-scaling stroke.
- **Pills** (`rounded.pill`). Every button and the student switch.
- **Hairlines.** 1px in `colors.line` for dividers and borders. Text fields and the message block use soft corners (`rounded.field`, `rounded.message`).

### Named Rules

**The Flat-Top Rule.** Decorative hexagons and path checkpoints have a flat top and bottom; path checkpoints align to lattice cells. Geographic markers follow actual place/city coordinates and are exempt from lattice alignment.

## Components

### Checkpoint

One stop on the path, and also the "You" and goal markers.

- **Shape:** flat-topped hexagon, width `30px + 4px × achievers`. "You" is 36px, the goal 100px.
- **Default:** 1px edge in Bone at 55%, fill Void at 50%.
- **Have:** edge in Glow, radial fill from near-white through Glow and Buzz Gold to `colors.gold-deep`, and a "You have this" label.
- **Next:** dashed Glow edge (5 on, 4 off), a hexagonal pulse that scales to 2× and fades over 2200ms, a "Next for you" label, and the stop's next event underneath.
- **Hover / press / focus:** scale 1.08 over 200ms; scale 0.96 on press; on keyboard focus the edge thickens to 2.5px in Glow.
- **Label:** name in Title, then "**9 of 14** did this · VIP team" in 13.5px Ash with the count in Bone. Labels sit above or below the hexagon, centred, 230px wide.
- **Change of state:** fill and edge crossfade over 500ms. Never snap.

### Strands and lattice

- One strand per alum who reached the goal. A strand leaves and enters every checkpoint level, as cubic curves with horizontal tangents, so routes never kink.
- Strands are Ember and drawn additively, so a stretch nine alumni share is visibly hotter than one a single alum took.
- A lattice cell on a route fills with Buzz Gold in proportion to the square root of the share of strands crossing it, and lights only when a strand reaches it.
- The lattice does not animate by itself. Cells warm slightly within 200px of the pointer.
- The route draws once, over about 2.5 seconds, strands starting 85ms apart. After that, dots keep travelling the strands at a constant, slow speed.

### Buttons

- **Shape:** pill, `9px 18px`.
- **Primary:** Glow fill, Void text. One per view at most: "Send the ask", "Accept a 15-minute call".
- **Ghost:** transparent with a hairline border; border turns Glow on hover.
- **Press:** `scale(0.97)` over 160ms on every pressable thing.
- **Arrow link:** Label style in Ash with an Ember `->` before it; turns Bone on hover. Used for seeded goals and "Set your goal".

### Student switch

The prototype's two-segment pill demonstrates switching sample student profiles. A Glow thumb slides between segments over 320ms; the selected label is Void, the other Ash. Switching student updates checkpoints, the "next" marker and the closest alumni together. This is a demo control, not the production identity model. Reuse its visual treatment for suitable view selectors without hard-coding two sample identities into the service.

### Goal field

A single borderless field in Display type with a hairline underneath that turns Glow at 70% on focus. Ember caret. Placeholder is Bone at 50%. A 58px circular ghost button with an arrow sits at its right end.

### People panel

- Slides in from the right over 460ms on the drawer curve and leaves in 240ms.
- Title in Headline, one Ash sentence stating the count, then person rows.
- **Person row:** name in Title at 600, major and class year in 13px Ash on the right, the shared tie in `colors.tie`, then a ghost "Ask" button.
- **Draft box:** opens in place under the row over 260ms. A text area with `rounded.field` corners, then Cancel (ghost, left) and Send (primary, right).
- **Status line:** a 7px dot and one sentence. Ash while waiting, Glow once accepted.

### Reply page

A centred column of at most 400px: wordmark, a Display-weight headline naming who is asking, a Label caption over the shared tie, a Label caption over the message in a hairline box, then one full-width primary button with 20px padding. After accepting, the button dims to a faint Glow tint with Glow text reading "Accepted", and the backdrop brightens.

### Landing

Three viewport-tall beats in a scroller with proximity snap: opening line left, second line right, then the goal field. A 3D honeycomb eases after the scroll position through three poses and ends face-on, dimmed, in the top right. Lines arrive word by word out of a 10px blur, 45ms apart. Text fades out under the top bar instead of passing behind it.

## Do's and Don'ts

### Do:

- **Do** take colours, type and radii from the frontmatter tokens. Copy the `:root` block in the prototype if you need them as CSS variables.
- **Do** align path checkpoints to the flat-topped lattice; place geographic markers at their actual coordinates.
- **Do** make brightness mean a count or a state, and write the count next to it in words: "9 of 14 did this".
- **Do** use the desktop path layout where appropriate and adapt navigation, feeds, and map details to the screen size.
- **Do** give every pressable element `scale(0.97)` press feedback and a visible keyboard focus state in Glow.
- **Do** check any new text colour against Void for 4.5:1 contrast.
- **Do** honour `prefers-reduced-motion` on anything you animate.

### Don't:

- **Don't** add shadows, glows or halos.
- **Don't** add pink, magenta, purple, or a second accent colour.
- **Don't** use circles for checkpoints or pointy-topped hexagons.
- **Don't** add gradient text or a second label style. Use shared tokens for any community or event cards.
- **Don't** animate the lattice, list rows or the top bar on their own, and don't use `ease-in`.
- **Don't** put saturated colour behind text.
- **Don't** rely on hover, fixed desktop dimensions, or a non-scrolling viewport for essential mobile interactions.
