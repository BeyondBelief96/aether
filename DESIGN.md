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
typography:
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
---

# Design System: Aether

## Overview

**Creative North Star: "The Live Specimen"**

The page is a sheet of off-white paper printed in near-black ink, and the physics scene is the specimen pinned to it. One large running subject owns the viewport; everything else is a printed instrument around it: a header rule, a row of axis sliders with their ranges and live values, a row of instances, a transport strip. Each parameter is drawn as an axis, so dragging it reads as remapping the specimen rather than editing a form. The system deliberately rejects the three-pane game-engine editor (scene tree, viewport, property grid).

The material is print. Hairline ink rules divide the sheet; there are no shadows, no floating panels and no cards. Controls are square-cornered outlined boxes (2px at most), selection is shown by inverting a box to solid ink, and the only round forms are slider thumbs. A single signal orange marks the one thing to press, where you are, and what has focus. Dark mode is not a second theme: it is the same sheet printed in reverse, with the accent lifted slightly so it keeps its punch on black.

Type is a two-voice specimen. A heavy, tightly tracked grotesk sets words, from the 64px demo title down to 13px control names; a monospace sets every number, unit, range end, key hint, axis letter and version string, always with tabular figures, so values hold still while they change.

**Key Characteristics:**
- Paper ground and ink, one signal-orange accent, dark mode as the reversed print.
- Grotesk for words, monospace for every number, unit, axis label and key hint.
- Hairline rules instead of containers; no shadows, no cards, radius 2px at most.
- Selected state is ink inversion; orange is reserved for action, location and focus.
- Data colours (four series, three fixed axes) come from one runtime palette shared by scene, charts and readouts.

## Colors

Warm paper and true ink with a single hot signal; data hues appear only when they carry data.

### Primary
- **Signal Orange** (signal-orange; dark: signal-orange-dark): the one accent. Fills the primary transport button (Pause/Play), draws the 2-3px underline under the current category, demo and data tab, is the focus ring on every control, fills the slider thumb on hover and drag, and is the caret colour in numeric fields. It is also data series 1, so the primary subject of a scene is often drawn in it.
- **Signal Orange Ink** (signal-orange-ink; dark: signal-orange-ink-dark): the text-safe orange. Link hover colour, the index arrow on hover, and the highlighted engine calls in the Code view (bold, over a 10% orange wash).

### Neutral
- **Paper** (paper; dark: paper-dark): page ground, slider thumb fill, and the text colour on ink-inverted selections.
- **Sunk Paper** (paper-sunk; dark: paper-sunk-dark): the stage ground and the hover fill for every outlined control and index cell. It is the only tonal step the system uses.
- **Ink** (ink; dark: ink-dark): body text, headings, outlines (as rule-strong), slider fill, and the solid fill of selected instances and segmented options.
- **Ink Two** (ink-2; dark: ink-2-dark): secondary prose: demo summary, stage hint, readout names, index descriptions, code strings.
- **Muted Graphite** (muted; dark: muted-dark): mono labels, range ends, key hints, unselected tabs, version, footer.
- **Hairline** (rule; dark: rule-dark): light dividers inside lists, readout rows and the index grid.
- **Ink Rule** (rule-strong; dark: rule-strong-dark): structural rules (header bottom, transport top, tab list, section heads) and every control outline.
- **Warn** (warn; dark: warn-dark): the dropped-time stat in the transport strip and flagged readout values. Shares its value with Signal Orange Ink.

### Data
Data colours live in `stage/palette.ts` and are written to `--series-1..4` and `--axis-x/y/z` at runtime, so a series is identical in the 3D scene, a chart line, a readout swatch and a callout.
- **Series 1-4** (series-1 orange, series-2 cobalt, series-3 green, series-4 violet; each with a dark variant): chart strokes, readout group swatches, callout text, scene bodies.
- **Axis X / Y / Z** (axis-x red, axis-y green, axis-z blue; each with a dark variant): fixed by product rule everywhere in UI and scene; always paired with the X/Y/Z letter.

### Named Rules
**The One Signal Rule.** Orange means press this, you are here, or focus is here. Selection is never orange; it is ink inversion.

**The Reverse Print Rule.** Dark mode inverts paper and ink and lifts the accent from #ff4b1f to #ff5a2e. It introduces no new hues and no new surfaces.

**The Data-Only Colour Rule.** Series and axis hues appear only as data: a line, a swatch, a body, a callout, an axis label. Never as decoration or a UI state.

## Typography

**Display Font:** Schibsted Grotesk Variable (with Helvetica Neue, Arial)
**Body Font:** Schibsted Grotesk Variable (same family)
**Label/Mono Font:** JetBrains Mono Variable (with ui-monospace, Menlo)

**Character:** A dense, newsprint-heavy grotesk run at weights 750 and 800 for specimen titles, set against a calm instrument mono for everything measured. Both are self-hosted variable fonts, and intermediate weights (650, 750) are used on purpose.

### Hierarchy
- **Display** (750, clamp 36-64px, 0.95, -0.035em): the demo title at the stage's top left, balanced wrap.
- **Headline** (750, clamp 28-40px, 1, -0.03em): the "All demos" index heading.
- **Title** (750, clamp 26-34px, 1, -0.03em): demo names in the index grid.
- **Wordmark** (800, 22px, -0.03em): "Aether" in the header only.
- **Lead** (400, 17px, 1.45): the one-line demo summary under the title, max 46ch.
- **Body** (400, 15px, 1.5): page default; nav tabs and data tabs at 600.
- **Control** (600, 13px, 1.3): parameter names, instance names, button labels; section heads in readouts at 650.
- **Numeral** (mono 500, 13px, tabular): live parameter values, select values, transport stats, vector fields.
- **Label** (mono 500, 11px, 0.08em, uppercase): control captions such as PHYSICS and SPEED; range ends, key hints, callouts and meta lines use the same 11px mono at 400-500 without uppercase.
- **Code** (mono 400, 13px, 1.6): the Code view.

### Named Rules
**The Mono Numbers Rule.** Every number, unit, range end, key hint, axis letter and version string is JetBrains Mono with tabular figures. Words are never mono; numbers are never grotesk.

**The Heavy Title Rule.** Titles run at 750 with negative tracking (-0.03 to -0.035em); body copy stays at 400 and control text at 500-600, so weight alone separates a title from an instrument.

## Layout

A single full-width column inside a 40px side gutter (16px at 720px and below). Spacing runs on an 8px unit (`--u`) and its multiples: 8 within a control group, 24 between the stacked demo rows, 32 between parameter columns and tab labels, 48 and 72 below major sections.

The demo page stacks, top to bottom: header (60px row, ink rule beneath, then a 48px sibling-demo row), the stage at `clamp(340px, 100dvh - 390px, 860px)` (56svh, min 300px on phones), the axis panel as an auto-fill grid of 240px-minimum columns, the instance row (150px-minimum cells plus ink action buttons), the transport strip under an ink rule, then the Readouts / Charts / Code tabs and the footer. The stage title and summary sit inside the stage at its top-left (24px inset); the interaction hint and orbit hint sit along its bottom edge.

The index is a ruled grid of 280px-minimum cells, 200px tall, each with title, summary (52ch) and a mono meta line pinned to the bottom.

Breakpoints: 900px hides the wordmark subtitle and version; 720px narrows the gutter, wraps the category nav to its own row, hides the stage summary and orbit hint, and lets transport stats wrap to a full row.

### Named Rules
**The Specimen First Rule.** The stage takes the largest share of the first viewport; controls sit beneath it, never beside it.

## Elevation & Depth

The system is flat. There is no `box-shadow` anywhere in the UI. Depth is a single tonal step (paper to sunk paper for the stage and hover states), hairline and ink rules for structure, and ink inversion for selection. The only translucent surface is the scene callout, an 86% paper wash so mono labels stay legible over the 3D view.

### Named Rules
**The Flat Sheet Rule.** Nothing floats. If an element needs separation, it gets a rule or the sunk tone, never a shadow.

## Shapes

Square by default: every outlined control, the stage and the vector field use a 2px radius, and segmented controls share edges (collapsed 1px borders, rounded only at the outer ends). The only round shapes are slider thumbs (20px circles with a 2px ink ring) and the icon strokes. Icons are authored on a 16px grid with a single 1.6 round-capped stroke. Active location is drawn with a flat 2px (nav) or 3px (data tabs) orange bar under the label; callouts are tagged with a 1px left rule in the series colour.

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

### Instances (preset buttons)
- **Style:** 52px outlined cells in an auto-fill grid; name in 600 13px grotesk, note beneath in 11px mono, number key hint at the right.
- **State:** hover fills sunk paper; the active instance inverts to ink with paper text, its note and key at 72% paper.

### Segmented choice
- **Style:** equal columns of 34px outlined options sharing 1px borders, 500 13px grotesk; caption above in control type.
- **State:** checked option inverts to ink; hover fills sunk paper.

### Inputs / Fields
- **Axis slider:** caption at left and live mono value at right, a 2px track in hairline with an ink fill to the value, a 20px paper thumb ringed in 2px ink, and mono min/max beneath. Hover and drag fill the thumb orange; drag scales it to 1.15.
- **Vector field:** three 34px outlined cells labelled X, Y, Z in 700 11px mono, values right-aligned in mono with an orange caret; focus-within draws the orange ring on the cell.
- **Select:** 36px outlined, mono value, an authored chevron at the right, captioned by an uppercase mono label.

### Navigation
- **Header:** wordmark and muted subtitle, category tabs in 600 15px grotesk (muted, ink on hover and when current, with a 2px orange bar), then All demos, GitHub and the mono package version at the right, closed by an ink rule. A second row lists the current category's demos in 13px with the same current bar. Tabs scroll horizontally on narrow screens.
- **Data tabs:** Readouts, Charts, Code in 600 15px on an ink rule; the selected tab gets a 3px orange bar that sits on the rule.

### Stage
The sunk-paper canvas holding the live scene, with the display title and lead summary overlaid at the top left, a "Try:" hint along the bottom, and an orbit hint in mono at the bottom right. Scene callouts are 11px mono tags with tabular figures on an 86% paper wash and a 1px left rule in their series colour, tracking the bodies they describe.

### Readouts and charts
Readouts are definition lists ruled in hairline under an ink rule, names in Ink Two and values right-aligned in mono, grouped under a heading with a 10px series swatch. Charts are 220px canvas line charts whose strokes read `--series-N`, with a legend of 16 x 2px line swatches.

### Demo index
A ruled grid of cells (hairline borders, no gaps, no radius). Each cell holds a 750 title with an arrow that slides 4px and turns orange-ink on hover, a summary, and a mono meta line ("3 parameters · 4 instances"). The open demo's cell inverts to ink.

## Do's and Don'ts

### Do:
- **Do** keep Signal Orange to the primary action, the current-location bar, focus and the dragged thumb.
- **Do** show selection by inverting to ink with paper text.
- **Do** set every number, unit, range end and key hint in JetBrains Mono with tabular figures.
- **Do** separate regions with a 1px ink rule or hairline, and use sunk paper as the only tonal step.
- **Do** read data colours from `--series-N` and `--axis-x/y/z` so scene, chart and readout match, and pair axis colour with its X/Y/Z letter.
- **Do** honour `prefers-reduced-motion` by dropping UI transitions; the simulation keeps running.

### Don't:
- **Don't** add shadows, cards, floating panels or radii above 2px (slider thumbs excepted).
- **Don't** introduce a second accent or use series and axis hues for UI state or decoration.
- **Don't** build a three-pane editor layout (scene tree, viewport, property grid); controls live under the stage.
- **Don't** design a separate dark palette; reverse the print.
