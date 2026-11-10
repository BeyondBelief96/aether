---
name: Aether
description: A 3D physics engine, from scratch.
colors:
    aether-teal: "#1a7d70"
    aether-teal-dark: "#3cc9b4"
    on-teal: "#ffffff"
    on-teal-dark: "#0b1512"
    ember-warn: "#c2410c"
    ember-warn-dark: "#fb923c"
    bench-bg: "#f4f5f7"
    bench-bg-dark: "#0f1114"
    panel: "#ffffff"
    panel-dark: "#171a1f"
    hairline: "#dde1e7"
    hairline-dark: "#2a2f37"
    ink: "#1b1f24"
    ink-dark: "#e6e9ee"
    muted-ink: "#5d6673"
    muted-ink-dark: "#8b95a3"
    stage: "#15181d"
    hud-surface: "#1e2229"
    hud-hairline: "#313844"
    axis-x: "#d93f45"
    axis-y: "#3a8f4b"
    axis-z: "#3b5fd0"
    axis-x-dark: "#ff6b6f"
    axis-y-dark: "#6fd17f"
    axis-z-dark: "#7b9bff"
    series-1: "#d93f45"
    series-2: "#1f8f80"
    series-3: "#b7791f"
    series-4: "#7c5cd6"
typography:
    title:
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
        fontSize: "20px"
        fontWeight: 700
        letterSpacing: "0.02em"
    body:
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
        fontSize: "14px"
        fontWeight: 400
        lineHeight: 1.45
    label:
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
        fontSize: "11px"
        fontWeight: 600
        letterSpacing: "0.08em"
    data:
        fontFamily: "ui-monospace, SF Mono, Menlo, monospace"
        fontSize: "14px"
        fontWeight: 400
        fontFeature: "tnum"
    small:
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
        fontSize: "12px"
        fontWeight: 400
rounded:
    sm: "4px"
    md: "6px"
    hud: "10px"
spacing:
    "1": "4px"
    "2": "8px"
    "3": "12px"
    "4": "16px"
    "5": "20px"
components:
    button-primary:
        backgroundColor: "{colors.aether-teal}"
        textColor: "{colors.on-teal}"
        rounded: "{rounded.md}"
        padding: "6px 10px"
    button-secondary:
        backgroundColor: "{colors.bench-bg}"
        textColor: "{colors.ink}"
        rounded: "{rounded.md}"
        padding: "6px 10px"
    segmented-option:
        backgroundColor: "{colors.bench-bg}"
        textColor: "{colors.ink}"
        typography: "{typography.small}"
        padding: "6px 2px"
    segmented-option-selected:
        backgroundColor: "{colors.aether-teal}"
        textColor: "{colors.on-teal}"
    input-number:
        backgroundColor: "{colors.bench-bg}"
        textColor: "{colors.ink}"
        typography: "{typography.data}"
        rounded: "{rounded.md}"
        padding: "4px 6px"
    hud-toolbar:
        backgroundColor: "{colors.hud-surface}"
        textColor: "{colors.ink-dark}"
        typography: "{typography.small}"
        rounded: "{rounded.hud}"
        padding: "4px 12px 4px 4px"
    hud-button-primary:
        backgroundColor: "{colors.aether-teal-dark}"
        textColor: "{colors.on-teal-dark}"
        rounded: "{rounded.md}"
        size: "36px"
---

# Design System: Aether

## Overview

**Creative North Star: "The Lab Bench"**

The playground is a quiet instrument panel next to a live experiment. The 3D scene is the subject and takes most of the screen. The sidebar holds labelled, calibrated controls and readouts. Nothing in the chrome competes with the motion in the viewport. The design shows in precision instead: numbers that don't jitter, units on every value, and one colour that means "act here".

The system is dense but calm. It uses the platform's own sans-serif for text and a monospace face with tabular digits for every measured value. There is one accent colour and a fixed red/green/blue mapping for the three axes. Surfaces are flat and separated by hairlines. Only things that float over the 3D scene lift off it. Light and dark themes follow the system setting, but the stage itself is always dark, so the physics reads the same in both.

**Key Characteristics:**

- The scene leads; the sidebar is fixed-width and quiet.
- One accent, used only for the primary action, slider fill, the selected option and the focus ring.
- X is red, Y is green, Z is blue, in every control, readout and viewport arrow.
- Every number is monospaced and tabular, with a unit and a fixed precision.
- Flat panels with 1px hairlines; shadows only on overlays above the stage.

## Colors

A neutral grey bench with one teal accent, an ember warning colour, and fixed axis and series colours that carry meaning.

### Primary

- **Aether Teal** (`aether-teal`, `aether-teal-dark`): the only accent. It marks the primary action (Play/Pause, Fire), the selected option in a segmented control, the slider fill and the keyboard focus ring. The light value is dark enough to carry white text at AA contrast. The dark value carries near-black text (`on-teal-dark`).

### Secondary

- **Ember Warn** (`ember-warn`, `ember-warn-dark`): states the user should notice. Examples are dropped time in the loop, gimbal lock and an unstable `ω·dt`. It colours text only, never fills.

### Tertiary

- **Axis Red, Green and Blue** (`axis-x`, `axis-y`, `axis-z`, with dark variants): X, Y and Z. They match Three.js's `AxesHelper`, so a label, an input marker, a matrix column and a viewport arrow for the same axis share one colour.
- **Series 1–4** (`series-1`…`series-4`): one colour per thing being compared in a chart or a group of readouts (e.g. the four integrators, the three springs). The order is fixed: red, teal, amber, violet. Dark-theme series values are brighter versions of the same hues.

### Neutral

- **Bench** (`bench-bg`, `bench-bg-dark`): the page background, and the fill for buttons and inputs, which sit slightly recessed against the panel.
- **Panel** (`panel`, `panel-dark`): the sidebar surface.
- **Hairline** (`hairline`, `hairline-dark`): every border and divider.
- **Ink and Muted Ink** (`ink`, `muted-ink` and dark variants): ink for values and controls. Muted ink for labels (`dt`), section headings and helper text.
- **Stage** (`stage`): the 3D viewport's background in both themes.
- **HUD Surface and HUD Hairline** (`hud-surface`, `hud-hairline`): overlays that float on the stage. They use dark-theme values in both themes, because the stage is always dark.

### Named Rules

**The One Accent Rule.** Aether Teal marks one action per group, the selected option and focus. If two things on screen are both teal fills, one of them is wrong.

**The Axis Rule.** Red is X, green is Y and blue is Z, everywhere, and these hues are never reused for anything else. When a series palette has to sit next to axis colours, label the series as well.

**The Dark Stage Rule.** The viewport stays dark in both themes. Anything drawn over it uses the HUD tokens, not the page theme.

## Typography

**Body Font:** the platform sans (`system-ui`, `-apple-system`, `Segoe UI`, sans-serif)
**Data Font:** the platform monospace (`ui-monospace`, `SF Mono`, Menlo, monospace) with tabular numerals

**Character:** System type disappears into the tool, so the monospace numbers stand out as the content.

### Hierarchy

- **Title** (700, 20px, +0.02em): the app name at the top of the sidebar. It is the only large text.
- **Body** (400, 14px, 1.45): control labels, demo summaries and readout labels.
- **Label** (600, 11px, +0.08em, uppercase, muted ink): section headings (`h2`) and readout-group headings (`h3`). Readout-group headings may take a series colour to tie them to their object in the scene.
- **Data** (400, 14px, monospace, tabular): every measured or set value, including slider outputs, `dd` readouts and numeric inputs.
- **Small** (400, 12px): segmented-control options, the keyboard-hint footer and the HUD toolbar.

### Named Rules

**The Tabular Rule.** Every number that changes over time is monospaced with `tabular-nums`, has a fixed precision per quantity, and shows its unit (`m`, `m/s`, `N`, `Hz`, `°`, `s`). A bare or jittering number is a bug.

## Layout

- **Desktop:** a two-column grid. The viewport takes the remaining width and the sidebar is fixed at 300px on the right, with the full viewport height (`100dvh`).
- **Sidebar:** a single column of sections. The gap between sections is 20px, the gap inside a section is 10px, and the padding is 20px vertical and 16px horizontal. The sidebar scrolls on its own with a thin scrollbar. Its order is: title, demo picker and summary, the demo's controls, then loop settings.
- **Below 720px:** the layout stacks. The viewport takes the top 60dvh and the sidebar follows, with a top border instead of a left one. Keyboard hints are hidden on devices without hover.
- **HUD toolbar:** pinned 16px from the bottom-left of the viewport (12px on phones). Below 420px it drops the steps-per-frame readout.
- **Spacing rhythm:** multiples of 4px (4 / 8 / 12 / 16 / 20). Readout-group headings get 8px more space above them than below.
- **Readouts:** a two-column grid with the label left (muted) and the value right-aligned, and a 4px × 12px gap.

## Elevation & Depth

The system is flat. The sidebar, panels, buttons and inputs sit on one plane, separated by 1px hairlines and a slight tonal step between the bench and the panel. Depth is reserved for things that float over the 3D stage, where a shadow separates the UI from the moving scene behind it.

### Shadow Vocabulary

- **Stage overlay** (`box-shadow: 0 6px 20px rgb(0 0 0 / 0.35)`): the HUD toolbar, and any future overlay on the viewport.

### Named Rules

**The Flat Bench Rule.** Nothing in the sidebar has a shadow. If a group needs separating, use space or a hairline, not elevation.

## Shapes

Gently softened rectangles. Controls, inputs, segmented groups and the chart frame use a 6px radius. Keyboard hints (`kbd`) use 4px. The floating HUD toolbar uses 10px, a slightly softer radius that sets it apart from the stage. Segmented controls join their options into one shape: only the outer corners are rounded, and the inner seams are single hairlines. Viewport icons are drawn as SVG on a 16px grid, filled for transport glyphs and drawn as 1.6px rounded strokes for reset-style glyphs.

## Components

### Buttons

Calibrated and plain: they look like a bench instrument's switches, not marketing buttons.

- **Shape:** gently softened (6px).
- **Primary:** an Aether Teal fill with on-teal text and 6px × 10px padding. One per group: Play/Pause, Fire.
- **Secondary:** a bench fill, ink text and a hairline border. Buttons in a row share its width equally.
- **Hover / Focus:** on hover the border darkens to muted ink. Focus shows a 2px Aether Teal outline offset by 2px.
- **Disabled:** 50% opacity and a default cursor. Step stays visible but disabled while the simulation runs.

### Segmented Control

- **Style:** joined options in a bench fill with hairline seams, small type, and equal widths.
- **State:** the selected option fills with Aether Teal and on-teal text. Hovered options lift to the panel colour. A label above the control names the group for screen readers too.

### Inputs / Fields

- **Sliders:** a native range input tinted with `accent-color: Aether Teal`. The label sits on the left and the live value on the right in the data face.
- **Numeric vector input:** three fields in the data face with a bench fill, a hairline border and a 6px radius. Each has a 3px left marker in its axis colour. This is the one sanctioned coloured edge, because it carries the Axis Rule.
- **Focus:** a 2px Aether Teal outline.
- **Select:** the native select, styled with the button tokens.

### Readouts

- **Style:** a `dl` grid. The label is muted body text on the left. The value is ink in the data face, right-aligned.
- **Groups:** an uppercase label heading, optionally in a series colour, introduces each group.
- **Warning:** the value turns Ember Warn, and a tooltip or label explains why.

### Line Chart

- **Style:** a canvas framed by a hairline at 6px radius on the bench fill. Axis ticks are 11px monospace in muted ink. One line per series, with a dashed reference line at 1.0 where it applies.

### HUD Toolbar (signature)

The transport strip floating on the stage: Play/Pause, Step and Reset as 36px icon buttons, a hairline divider, then live loop stats (fps, steps per frame, sim time) in small monospace with muted units. It uses the HUD tokens in both themes, a 10px radius and the stage-overlay shadow. Play/Pause is the primary button, filled with the dark-theme Aether Teal. Steps per frame turns Ember Warn when the loop drops time. Tooltips name each keyboard shortcut.

## Do's and Don'ts

### Do:

- **Do** use a token (`var(--…)`) for every colour in UI code, and add a dark value next to each new one.
- **Do** keep `src/playground/demos/helpers/colors.ts` in step with the dark-theme axis and series tokens, since the stage is always dark. Three.js can't read CSS variables.
- **Do** show every changing number in the data face with a unit and a fixed precision.
- **Do** give every input a visible label or an `aria-label`, and keep the 2px Aether Teal focus ring.
- **Do** put new viewport overlays on the HUD tokens with the stage-overlay shadow.

### Don't:

- **Don't** add a second accent colour, or fill more than one button per group with Aether Teal.
- **Don't** reuse red, green or blue for anything other than X, Y and Z.
- **Don't** add shadows or tonal cards inside the sidebar. It stays flat.
- **Don't** let the viewport follow the light theme. The stage is always dark.
- **Don't** use coloured edges thicker than 1px except the axis marker on vector inputs.
