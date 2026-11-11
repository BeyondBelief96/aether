---
version: 1
slug: "apps-editor"
primary_target: "apps/editor"
related_targets: []
---

# Surface: Aether demo app ("the editor")

Mode: Operate. Scope: `apps/editor`, the browser app that runs the engine's showcase demos and exposes their parameters.

Audience and job: developers judging or exploring `aether-physics` open a demo, are struck by it, drag its parameters, and read the code that drives it. Constraints: Lit + Three.js, desktop-first and phone-safe, light and dark from the system, keyboard Space / . / R, X/Y/Z axis colours fixed.

Memorable moment: dragging an axis slider remaps the running scene under your hand while its mono coordinate updates; picking an instance morphs every axis to it.

Unresolved: whether the future site embeds this app or links to it.

## Direction contract

THESIS: The scene is the specimen. One large live subject owns the page, and every parameter is an axis that remaps it as you drag. Refuses the three-pane game-engine editor (scene tree, viewport, property grid).

OWN-WORLD: Paper ground and ink, one signal-orange accent; dark mode is the same sheet printed in reverse. A clean grotesk for words, a monospace for every number, axis label and key hint. Hairline ink rules, square controls, round slider thumbs, no shadows, no cards, 2px radius at most. Category data series are the only other colours.

STORY: The visitor sees a demo already running, understands what it is from a title and one line, drags an axis, switches instance, opens Readouts, Charts or Code, then picks another demo from the specimen grid of all demos.

FIRST VIEWPORT: Header rule: wordmark, category tabs, package version. Stage below at about 60% height with title and summary at top left and mono callouts beside bodies. Under it, a full-width row of axis sliders with min/max and live values, then the instance row with key hints, then the transport strip: pause, step, reset, physics rate, time scale, fps.

FORM: challenger variable-font-specimen, the dealt challenger chosen over the assigned direction; seed:98720b2542b60a91.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
