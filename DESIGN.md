---
name: Aether
description: A live physics specimen on a sheet of paper; every parameter is an axis you drag.
colors:
  paper: "#f6f5f1"
  paper-sunk: "#ecebe6"
  ink: "#111111"
  ink-2: "#3a3a37"
  muted: "#6b6a64"
  rule: "rgb(17 17 17 / 0.14)"
  rule-strong: "#111111"
  signal-orange: "#ff4b1f"
  signal-orange-ink: "#c2360f"
  on-signal: "#111111"
  warn: "#c2360f"
  selection: "rgb(255 75 31 / 0.24)"
  paper-dark: "#121211"
  paper-sunk-dark: "#1a1a18"
  ink-dark: "#edece6"
  ink-2-dark: "#c7c6bf"
  muted-dark: "#9c9b94"
  rule-dark: "rgb(237 236 230 / 0.16)"
  rule-strong-dark: "#edece6"
  signal-orange-dark: "#ff5a2e"
  signal-orange-ink-dark: "#ff7a55"
  on-signal-dark: "#121211"
  warn-dark: "#ff7a55"
  selection-dark: "rgb(255 90 46 / 0.32)"
  series-1: "#ff4b1f"
  series-2: "#2747d6"
  series-3: "#0f8a5f"
  series-4: "#8a3fd1"
  series-1-dark: "#ff5a2e"
  series-2-dark: "#7d97ff"
  series-3-dark: "#3ccf8e"
  series-4-dark: "#c08bff"
  axis-x: "#d7263d"
  axis-y: "#2e9e4f"
  axis-z: "#2b59d9"
  axis-x-dark: "#ff5c6c"
  axis-y-dark: "#5fd17f"
  axis-z-dark: "#6f93ff"
  scene-muted: "#8e8d87"
  scene-muted-dark: "#77766f"
  grid-major: "#b9b8b1"
  grid-minor: "#d9d8d2"
  grid-major-dark: "#45443f"
  grid-minor-dark: "#2a2a27"
typography:
  hero:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(40px, 4.8vw, 68px)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  closing:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(44px, 6vw, 96px)"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.035em"
  display:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(36px, 4.4vw, 64px)"
    fontWeight: 750
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(28px, 3vw, 40px)"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.03em"
  section:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(30px, 3.4vw, 48px)"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.035em"
  page-title:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(36px, 4vw, 56px)"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.035em"
  subhead:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(26px, 2.4vw, 34px)"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.03em"
  wordmark:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  lead:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  nav:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1
  control:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
  numeral:
    fontFamily: "JetBrains Mono Variable, ui-monospace, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.3
    fontFeature: "tnum"
  label:
    fontFamily: "JetBrains Mono Variable, ui-monospace, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.08em"
  code:
    fontFamily: "JetBrains Mono Variable, ui-monospace, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "2px"
  full: "50%"
spacing:
  u: "8px"
  u2: "16px"
  u3: "24px"
  u4: "32px"
  gutter: "40px"
  u6: "48px"
  u9: "72px"
  u14: "112px"
components:
  button:
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    typography: "{typography.control}"
    padding: "0 14px"
    height: "36px"
  button-hover:
    backgroundColor: "{colors.paper-sunk}"
  button-primary:
    backgroundColor: "{colors.signal-orange}"
    textColor: "{colors.on-signal}"
    rounded: "{rounded.sm}"
    typography: "{typography.control}"
    padding: "0 14px"
    height: "36px"
  button-icon:
    rounded: "{rounded.sm}"
    size: "36px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "0 20px"
    height: "52px"
  instance:
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "52px"
  instance-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  segmented-option:
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    padding: "0 10px"
    height: "34px"
  segmented-option-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  select:
    textColor: "{colors.ink}"
    typography: "{typography.numeral}"
    rounded: "{rounded.sm}"
    padding: "0 28px 0 10px"
    height: "36px"
  tab:
    textColor: "{colors.muted}"
    typography: "{typography.nav}"
    padding: "12px 0"
  tab-active:
    textColor: "{colors.ink}"
  slider-thumb:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.full}"
    size: "20px"
  slider-thumb-active:
    backgroundColor: "{colors.signal-orange}"
  stage:
    backgroundColor: "{colors.paper-sunk}"
    rounded: "{rounded.sm}"
  callout:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "3px 6px"
  button-site:
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    typography: "{typography.control}"
    padding: "0 18px"
    height: "44px"
  button-site-primary:
    backgroundColor: "{colors.signal-orange}"
    textColor: "{colors.on-signal}"
    rounded: "{rounded.sm}"
    typography: "{typography.control}"
    padding: "0 18px"
    height: "44px"
  install-line:
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "44px"
  checkbox:
    rounded: "{rounded.sm}"
    size: "18px"
  checkbox-checked:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  scene-tag:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "3px 7px"
  docs-link:
    textColor: "{colors.ink-2}"
    padding: "6px 0"
  docs-link-active:
    textColor: "{colors.ink}"
  notice:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
---

# Design System: Aether

## Overview

**Creative North Star: "The Live Specimen"**

The page is a sheet of off-white paper printed in near-black ink, and the physics scene is the specimen pinned to it. One large running subject owns the viewport; everything else is a printed instrument around it: a header rule, a row of axis sliders with their ranges and live values, a row of instances, a transport strip. Each parameter is drawn as an axis, so dragging it reads as remapping the specimen rather than editing a form. The system deliberately rejects the three-pane game-engine editor (scene tree, viewport, property grid).

The material is print. Hairline ink rules divide the sheet; the interface has no shadows, no floating panels and no cards. Controls are square-cornered outlined boxes (2px at most), selection is shown by inverting a box to solid ink, and the only round forms are slider thumbs. A single signal orange marks the one thing to press, where you are and what has focus. Dark mode is not a second theme: it is the same sheet printed in reverse, with the accent lifted slightly so it keeps its punch on black.

The specimen itself is the one place with physical light. Every 3D scene, in the demo app and on the website alike, shares one look: soft sun shadows caught by an invisible ground, low environment light, filmic tone mapping, and a floor that fades into the sunk-paper ground. The sheet is flat; the thing pinned to it is solid. Public surfaces show only what exists: nothing unbuilt is drawn, listed or promised.

Type is a two-voice specimen. A heavy, tightly tracked grotesk sets words, from the 96px closing headline down to 13px control names; a monospace sets every number, unit, range end, key hint, axis letter, phase number, install command and version string, always with tabular figures, so values hold still while they change.

**Key Characteristics:**
- Paper ground and ink, one signal-orange accent, dark mode as the reversed print.
- Grotesk for words, monospace for every number, unit, axis label and key hint.
- Hairline rules instead of containers; no UI shadows, no cards, radius 2px at most.
- Only what exists is shown. No roadmap, no outlines of future work, no "coming soon".
- One shared scene look: soft shadows on a shadow-only ground, environment light, ACES tone mapping, fog in the ground colour.
- Selected state is ink inversion; orange is reserved for action, location and focus.
- Data colours (four series, three fixed axes) come from one runtime palette shared by scene, charts and readouts.

## Colors

Warm paper and true ink with a single hot signal; data hues appear only when they carry data.

### Primary
- **Signal Orange** (signal-orange; dark: signal-orange-dark): the one accent. Fills the primary transport button (Pause/Play), draws the 2-3px underline under the current category, demo and data tab, is the focus ring on every control, fills the slider thumb on hover and drag, is the caret colour in numeric fields, and the underline colour of inline links (section links, docs prose; the footer underline turns orange on hover). It is also data series 1, so the primary subject of a scene is often drawn in it.
- **Signal Orange Ink** (signal-orange-ink; dark: signal-orange-ink-dark): the text-safe orange. Link hover colour, the index arrow on hover, and the highlighted engine calls in the Code view (bold, over a 10% orange wash).

### Neutral
- **Paper** (paper; dark: paper-dark): page ground, slider thumb fill, and the text colour on ink-inverted selections.
- **Sunk Paper** (paper-sunk; dark: paper-sunk-dark): the stage ground (and the 3D scene background, which equals it), every code block's ground, and the hover fill for every outlined control and index cell. It is the only tonal step the system uses.
- **Ink** (ink; dark: ink-dark): body text, headings, outlines (as rule-strong), slider fill, and the solid fill of selected instances and segmented options.
- **Ink Two** (ink-2; dark: ink-2-dark): secondary prose: demo summary, stage hint, readout names, index descriptions, code strings.
- **Muted Graphite** (muted; dark: muted-dark): mono labels, range ends, key hints, unselected tabs, version, footer fine print, and the hero's interaction hint.
- **Hairline** (rule; dark: rule-dark): light dividers inside lists, readout rows and the index grid.
- **Ink Rule** (rule-strong; dark: rule-strong-dark): structural rules (header bottom, transport top, tab list, footer top), the 2px rule that opens each website section, and every control outline.
- **Warn** (warn; dark: warn-dark): the dropped-time stat in the transport strip and flagged readout values. Shares its value with Signal Orange Ink.

### Data
Data colours live in `stage/palette.ts` and are written to `--series-1..4` and `--axis-x/y/z` at runtime, so a series is identical in the 3D scene, a chart line, a readout swatch and a callout.
- **Series 1-4** (series-1 orange, series-2 cobalt, series-3 green, series-4 violet; each with a dark variant): chart strokes, readout group swatches, callout text, scene bodies.
- **Axis X / Y / Z** (axis-x red, axis-y green, axis-z blue; each with a dark variant): fixed by product rule everywhere in UI and scene; always paired with the X/Y/Z letter.

### Scene
The same palette carries the scene-only neutrals, used in WebGL and never in CSS.
- **Scene Muted** (scene-muted; dark: scene-muted-dark): secondary bodies, fixtures, and inactive lines. It sits closer to the ground than Muted Graphite in both themes, so fixtures recede under scene light.
- **Grid Major / Minor** (grid-major, grid-minor; each with a dark variant): the 120 m floor grid, 1 m divisions.
- The palette's `liquid` (#6f9ed6, dark #3d6ea8) tints translucent water in the buoyancy demo; it is a material, not a series.

### Named Rules
**The One Signal Rule.** Orange means press this, you are here, or focus is here. Selection is never orange; it is ink inversion.

**The Reverse Print Rule.** Dark mode inverts paper and ink and lifts the accent from #ff4b1f to #ff5a2e. It introduces no new hues and no new surfaces.

**The Data-Only Colour Rule.** Series and axis hues appear only as data: a line, a swatch, a body, a callout, an axis label. Never as decoration or a UI state.

**The Only What Exists Rule.** Public surfaces show what the engine does today and nothing else: no roadmap, no outlines of unbuilt features, no phase numbers, no "next" or "coming". New things appear when they ship.

## Typography

**Display Font:** Schibsted Grotesk Variable (with Helvetica Neue, Arial)
**Body Font:** Schibsted Grotesk Variable (same family)
**Label/Mono Font:** JetBrains Mono Variable (with ui-monospace, Menlo)

**Character:** A dense, newsprint-heavy grotesk run at weights 750 and 800 for specimen titles, set against a calm instrument mono for everything measured. Both are self-hosted variable fonts (one shared `fonts` import used by the demo app and the website), and intermediate weights (650, 750) are used on purpose.

### Hierarchy
- **Closing** (750, clamp 44-96px, 1, -0.035em): the landing page's closing headline ("Pull on something."); the largest type in the system.
- **Hero** (800, clamp 40-68px, 0.95, -0.04em): the landing headline over the hero stage, balanced wrap, max min(640px, 100% - 80px). The 404 headline uses the same 800 / -0.04em cut at clamp 48-96px.
- **Display** (750, clamp 36-64px, 0.95, -0.035em): the demo title at the stage's top left, balanced wrap.
- **Section** (750, clamp 30-48px, 1, -0.035em): website section heads (Runs today, The road to rigid bodies, Plain TypeScript).
- **Page Title** (750, clamp 36-56px, 1, -0.035em): the docs page heading.
- **Headline** (750, clamp 28-40px, 1, -0.03em): the "All demos" index heading.
- **Title** (750, clamp 26-34px, 1, -0.03em): demo names in the index grid; the landing's "Runs today" demo names use the same cut at a fixed 28px.
- **Subhead** (700, 22px, 1.15, -0.02em): docs prose h2. Fact figures on the landing run at 700 20px.
- **Wordmark** (800, 22px, -0.03em): "Aether" in the demo header and the site nav; the footer repeats it at 18px.
- **Lead** (400, 17px, 1.45): the one-line demo summary under the title (max 46ch), the hero line (42ch), section intros (44ch, 1.5) and docs prose (1.6, article max 68ch).
- **Body** (400, 15px, 1.5): page default; nav tabs and data tabs at 600.
- **Control** (600, 13px, 1.3): parameter names, instance names, button labels; section heads in readouts at 650.
- **Numeral** (mono 500, 13px, tabular): live parameter values, select values, transport stats, vector fields.
- **Label** (mono 500, 11px, 0.08em, uppercase): control captions such as PHYSICS and SPEED and docs sidebar group heads. Range ends, key hints, callouts, scene tags, stub markers and meta lines use the same 11px mono at 400-500 without uppercase.
- **Code** (mono 400, 13px, 1.6): the Code view and docs code blocks. The landing code sample and the install line run mono at 14px (1.7 for the sample).

### Named Rules
**The Mono Numbers Rule.** Every number, unit, range end, key hint, axis letter, phase number, scene tag, shell command and version string is JetBrains Mono with tabular figures. Words are never mono; numbers are never grotesk.

**The Heavy Title Rule.** Titles run at 750 with negative tracking (-0.03 to -0.035em), and the loudest headlines (wordmark, landing hero, 404) at 800 down to -0.04em; subheads at 700; body copy stays at 400 and control text at 500-600, so weight alone separates a title from an instrument.

## Layout

A single full-width column inside a 40px side gutter (16px at 720px and below). Spacing runs on an 8px unit (`--u`) and its multiples: 8 within a control group, 24 between the stacked demo rows, 32 between parameter columns and tab labels, 48 and 72 below major sections.

The demo page stacks, top to bottom: header (60px row, ink rule beneath, then a 48px sibling-demo row), the stage at `clamp(340px, 100dvh - 390px, 860px)` (56svh, min 300px on phones), the axis panel as an auto-fill grid of 240px-minimum columns, the instance row (150px-minimum cells plus ink action buttons), the transport strip under an ink rule, then the Readouts / Charts / Code tabs and the footer. The stage title and summary sit inside the stage at its top-left (24px inset); the interaction hint and orbit hint sit along its bottom edge.

The index is a ruled grid of 280px-minimum cells, 200px tall, each with title, summary (52ch) and a mono meta line pinned to the bottom.

Embedded in the website (`<aether-editor embedded>` on the demos page), the editor drops its own wordmark, GitHub link, version and footer, since the site nav and footer supply them, and folds the sibling-demo row into the header: one 60px row of category tabs, a hairline-ruled demo list, then All demos. The stage becomes `clamp(340px, 100dvh - 400px, 860px)` to leave room for the site nav above it. The site's main column goes full bleed there because the editor pads itself.

The website shares the gutter and unit. Its nav is a 60px row ruled in ink; its footer sits 80px below the content, 32px padded, under an ink rule. On the landing page, sections are separated by 112px (`u14`) and each opens on a 2px ink rule with its head and a right-aligned text link on one baseline, 16px above the rule.
- **Hero stage:** full gutter width, `clamp(520px, 100svh - 92px, 900px)` tall, 20px below the nav, 2px radius, the live scene filling it. Headline, line and actions sit over its top left at a 40px inset; the interaction hint sits at its bottom left, 40px in and 24px up.
- **Runs today:** three equal columns divided by hairline vertical rules, each a 280px live scene, a name with arrow and a one-line summary, 24px padding.
- **Code section:** 5fr copy and 7fr code sample, 56px apart; a two-column facts list ruled in hairline.
- **Docs:** a sticky 220px sidebar and a 68ch article, 64px apart, 40px below the nav.

Breakpoints: 900px hides the wordmark subtitle and version; 720px narrows the gutter, wraps the category nav to its own row, hides the stage summary and orbit hint, lets transport stats wrap to a full row, and hides the site nav's version and GitHub label. On the website, 1000px stacks the code section; 860px stacks the docs sidebar above the article; 760px stacks the hero (copy, then the scene at 56svh with a 320px minimum and no radius, with the hint hidden), centres the hero camera on the cloth, and stacks Live demos into one column with horizontal hairlines.

### Named Rules
**The Specimen First Rule.** The stage takes the largest share of the first viewport; controls sit beneath it, never beside it.

## Elevation & Depth

The interface is flat. No element casts a `box-shadow`. Depth is a single tonal step (paper to sunk paper for the stage, code blocks and hover states), hairline and ink rules for structure, and ink inversion for selection.

Translucent washes exist only where text sits over the live scene, so it stays legible: scene callouts on an 86% paper wash, scene tags on 88% paper, the stage summary and Try line on an 82% sunk-paper wash (cloned per line, 1px 4px padding, hung 4px left so the text keeps its edge), and the install line on 80% paper.

The 3D scene is the exception by design: the specimen is lit. One shared stage gives every scene the same physical look:
- **Light:** a white sun at (8, 16, 10), intensity 2.4 light / 2.1 dark, plus a hemisphere light (white over #c9c6bc light / #26251f dark, 1.3 / 1.1) and a `RoomEnvironment` map at 0.35 intensity.
- **Shadows:** soft (PCF soft, 2048 map, radius 6) over a 48 m square, caught by an invisible ground whose `ShadowMaterial` is black at 0.12 opacity light and 0.45 dark. Only opaque, depth-tested meshes cast and receive.
- **Tone:** ACES filmic tone mapping at 1.05 exposure, sRGB output.
- **Horizon:** fog in the ground colour from 1.2x to 3.2x the camera's distance to its target, refitted on every orbit and zoom, so the grid always fades at the same place on screen.
- **Framing:** 42 degree field of view; below a 1.25 aspect the camera backs off along its line by (1.25 / aspect)^0.75 so wide scenes keep their width on narrow stages. Orbit stops just above the ground.

### Named Rules
**The Flat Sheet Rule.** Nothing on the sheet floats. If an interface element needs separation, it gets a rule or the sunk tone, never a shadow. Shadows belong to the scene's bodies, cast by the shared sun onto the shared ground.

## Shapes

Square by default: every outlined control, the stage and the vector field use a 2px radius, and segmented controls share edges (collapsed 1px borders, rounded only at the outer ends). The only round shapes are slider thumbs (20px circles with a 2px ink ring) and the icon strokes. Icons are authored on a 16px grid with a single 1.6 round-capped stroke, shared by the demo app and the website. Active location is drawn with a flat 2px (nav) or 3px (data tabs) orange bar under the label, or, where the label is a text link (All demos when current, the docs sidebar), a 2px orange underline 6px below the text. Callouts are tagged with a 1px left rule in the series colour, scene tags with a 1px ink left rule.

On the phone-width landing page the hero stage loses its radius and runs edge to edge inside the gutter.

### Named Rules
**The Square Control, Round Thumb Rule.** Controls are boxes with at most 2px corners; only the thing you drag is round.

## Components

Instruments, not widgets: outlined ink boxes, quiet until touched, inverted when chosen.

### Buttons
- **Shape:** squared (2px), 1px ink outline, 36px tall, 14px side padding, 600 13px grotesk, 8px icon gap.
- **Primary:** solid Signal Orange with ink text (Pause/Play with its Space key hint at 62% opacity). One per screen.
- **Hover / Focus:** outlined buttons fill with sunk paper; primary mixes 14% ink into the orange. Colour transitions at 160ms on `cubic-bezier(0.16, 1, 0.3, 1)`. Focus is a 2px orange outline at 2px offset.
- **Icon:** 36px square outlined button holding a 16px authored icon (step, reset).
- **Ink action:** solid ink with paper text, 52px tall, for demo actions such as Launch, with its key hint at 70% opacity.
- **Disabled:** 40% opacity, no hover fill.
- **Website buttons:** the same outlined and primary buttons at link size, 44px tall with 18px side padding; text links styled as buttons, with an arrow icon on the main call to action. The landing's closing row pairs one primary (Open the demos) with outlined ones.

### Install line
A mono command in a button: `$` prompt in Muted Graphite, `npm install aether-physics` in 500 14px mono ink, then a state word in 600 13px grotesk, muted, behind a hairline left rule with 12px padding. 44px tall, 1px ink outline, 2px radius, over an 80% paper wash so it reads above the hero scene; hover goes to solid paper. Click copies the command and the state reads Copied (or Select and copy when the clipboard is refused), returning to Copy after 1.8s; the whole command is `user-select: all`.

### Checkbox
The transport's Smooth toggle: an 18px square with a 1px ink outline and 2px radius, label in 600 13px grotesk with an 8px gap, 36px tall. Checked inverts to ink with a 2px paper check mark, the same inversion as any selection.

### Instances (preset buttons)
- **Style:** 52px outlined cells in an auto-fill grid; name in 600 13px grotesk, note beneath in 11px mono, number key hint at the right.
- **State:** hover fills sunk paper; the active instance inverts to ink with paper text, its note and key at 72% paper.

### Segmented choice
- **Style:** equal 34px options inside one 1px ink outline (2px radius), divided by 1px ink rules, 500 13px grotesk; caption above in control type.
- **Wrapping:** options sit in one row when their measured labels fit; otherwise they wrap into the fewest rows that fit, spread evenly (four options become two rows of two, never three and one). A short last row's final option takes the rest of the row. Labels stay short, one or two words; a label that still cannot fit ends in an ellipsis with the full name as its tooltip.
- **State:** checked option inverts to ink; hover fills sunk paper.

### Inputs / Fields
- **Axis slider:** caption at left and live mono value at right, a 2px track in hairline with an ink fill to the value, a 20px paper thumb ringed in 2px ink, and mono min/max beneath. Hover and drag fill the thumb orange; drag scales it to 1.15.
- **Vector field:** three 34px outlined cells labelled X, Y, Z in 700 11px mono, values right-aligned in mono with an orange caret; focus-within draws the orange ring on the cell.
- **Select:** 36px outlined, mono value, an authored chevron at the right, captioned by an uppercase mono label.

### Navigation
- **Header:** wordmark and muted subtitle, category tabs in 600 15px grotesk (muted, ink on hover and when current, with a 2px orange bar), then All demos, GitHub and the mono package version at the right, closed by an ink rule. A second row lists the current category's demos in 13px with the same current bar. Tabs scroll horizontally on narrow screens.
- **Header, embedded:** inside the website the header is one row: category tabs, then the current category's demos in 13px behind a 24px hairline left rule, then All demos at the right. No wordmark, GitHub or version; the site nav carries them.
- **All demos link:** 600 13px ink with a grid icon; ink-orange on hover; when the index is open it takes the 2px orange underline.
- **Site nav:** the same anatomy for the website. Wordmark at left, then Demos and Docs in 600 15px muted (ink on hover and when current, with the 2px orange bar 4px above the ink rule), then GitHub with an external icon and the mono package version at the right. At 720px the version and the GitHub label hide, leaving the icon.
- **Site footer:** wordmark at 18px, a one-line description in 13px Ink Two (40ch), and a row of 600 13px ink links underlined in hairline that turn orange on hover; mono fine print beneath with version and licence.
- **Docs sidebar:** groups headed by the uppercase mono label; links in 500 13px Ink Two with 6px vertical padding, ink on hover. The current page goes to ink at 650 with a 2px orange underline 6px under the label. Unwritten pages carry a muted mono "stub" marker at the right.
- **Data tabs:** Readouts, Charts, Code in 600 15px on an ink rule; the selected tab gets a 3px orange bar that sits on the rule.

### Stage
The sunk-paper canvas holding the live scene, with the display title and lead summary overlaid at the top left, a "Try:" hint along the bottom, and an orbit hint in mono at the bottom right. The summary and Try lines sit on an 82% sunk-paper wash so they stay legible over the floor grid. Scene callouts are 11px mono tags with tabular figures on an 86% paper wash and a 1px left rule in their series colour, tracking the bodies they describe.

### Scene (embeddable)
`<aether-scene>` runs one demo with no controls, for pages that show the engine at work: the landing hero and the Live demos cells. Same shared stage and scene look, sunk-paper background before the first frame (and for good where WebGL is missing), scroll-zoom off and vertical touch scroll passed through, drawing paused while off screen. A page may add its own scenery around the demo and pin tags to scene points.
- **Tag:** 500 11px mono, ink, 3px 7px padding, on an 88% paper wash with a 1px ink left rule, placed 12px right of its point and flipped to the left near the edge.

### Hero stage
The landing page's first viewport: a live cloth drawn in series orange, right of centre, that visitors can drag by its pins. The headline, one lead line and two actions (the primary button and the install line) sit over the top left; a mono interaction hint in muted sits at the bottom left.

### Docs page
Sidebar and article (see Layout). The page title in the Page Title cut; a stub page opens with a notice: an outlined box (1px ink, 2px radius, 12px 16px padding) in 13px Ink Two, no tint and no icon. Prose is 17px Ink Two at 1.6, links ink underlined orange, h2 in the Subhead cut, code blocks on sunk paper with 2px radius and 16px padding.

### Readouts and charts
Readouts are definition lists ruled in hairline under an ink rule, names in Ink Two and values right-aligned in mono, grouped under a heading with a 10px series swatch. Charts are 220px canvas line charts whose strokes read `--series-N`, with a legend of 16 x 2px line swatches.

### Demo index
A ruled grid of cells (hairline borders, no gaps, no radius). Each cell holds a 750 title with an arrow that slides 4px and turns orange-ink on hover, a summary, and a mono meta line ("3 parameters · 4 instances"). The open demo's cell inverts to ink. The landing's Runs today row reuses the pattern with a live scene on top of each cell.

## Do's and Don'ts

### Do:
- **Do** keep Signal Orange to the primary action, the current-location bar or underline, focus, the dragged thumb and link underlines.
- **Do** show selection by inverting to ink with paper text.
- **Do** set every number, unit, range end and key hint in JetBrains Mono with tabular figures.
- **Do** separate regions with a 1px ink rule or hairline (2px ink to open a website section), and use sunk paper as the only tonal step.
- **Do** add a feature to the site when it ships, and not before.
- **Do** build every 3D view on the shared stage so light, shadow, tone mapping and fog match everywhere.
- **Do** put a translucent paper or sunk-paper wash (80-88%) behind text that sits over a live scene.
- **Do** read data colours from `--series-N` and `--axis-x/y/z` so scene, chart and readout match, and pair axis colour with its X/Y/Z letter.
- **Do** honour `prefers-reduced-motion` by dropping UI transitions; the simulation keeps running.

### Don't:
- **Don't** add interface shadows, cards, floating panels or radii above 2px (slider thumbs excepted). Cast shadows belong to scene bodies only.
- **Don't** light, fog or tone-map a scene by hand; the shared stage owns the look.
- **Don't** introduce a second accent or use series and axis hues for UI state or decoration.
- **Don't** build a three-pane editor layout (scene tree, viewport, property grid); controls live under the stage.
- **Don't** design a separate dark palette; reverse the print.
