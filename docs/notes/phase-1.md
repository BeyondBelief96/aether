# Phase 1: math library

Drafted from the commit history and the final work session. The two sections at the end are personal, so they're left for you to fill in.

## What got built

- `Vec3`, `Mat3x3`, `Mat3x4` and `Quaternion`, with `Vec3Like` and `QuatLike` as inputs.
- 608 tests, including custom matchers (`toBeCloseToVec3`, `toBeCloseToQuat`) and `fast-check` property tests.
- The rotation gizmo demo: axis–angle and Euler input, four readouts of one quaternion, and gimbal rings that show the lock.
- Reusable UI: `<aether-slider>`, `<aether-vec3-input>`, `formatNumber`, shared panel styles and `DragHandle`.

## Decisions

- **Methods deferred to the phase that first needs them.** `Mat3x3.setInertiaTensorCoeffs` waits for Phase 4. `Mat3x3.setSkewSymmetric` and `Mat3x3.add` wait for Phase 7.
- **No `orthonormalize()` on `Mat3x3`.** Orientation is stored as a quaternion and renormalized, so derived matrices don't drift. Phase 6 will need a basis-from-normal builder for contacts.
- **The axis input keeps values as typed.** The first version normalized on every edit: start from `0, 1, 0`, type `1` in X, and you got `0.707, 0.707, 0`. Now the input only rejects the zero vector, and the demo normalizes where it uses the axis.
- **The playground uses only the public API.** Demos and UI import from `"aether-physics"`, an alias for `src/index.ts`, so anything they need has to be exported.

## Bugs and how they were found

**Horizontal scrollbar in the sidebar.** It looked like the panel was too narrow after the new readouts went in, but measuring showed the width was fine. Prettier formats `html` templates and had wrapped the Axis row's `<dd>` across lines. `dd` is `white-space: pre`, so the line breaks and indentation rendered as text, pushing the content 19 px too wide and making the row three lines tall. Printing the element's `textContent` showed the stray whitespace. The Steps / frame row had the same bug. The fix is to build the value before the template, so there's nothing to wrap.

**A package name that looked free but wasn't.** `aetherjs` returned a 404 on npm, but `aether-js` exists, and npm generally rejects names that differ only by punctuation. Check the variants too, not just the exact name.

**Test problems that looked like app bugs.** Neither of these was a fault in the demo:

- The `.` key seemed to step only sometimes, but the sidebar's stats refresh every 250 ms and the check read them too soon.
- Dragging the handle seemed broken, but the check pressed before the first frame was drawn, when the handle's world position was still the origin. A sweep of the pointer showed hits centered exactly on the predicted spot.

## Questions from the walkthrough

1. **Why store a quaternion and derive Euler angles, rather than the reverse?** Euler angles lose a degree of freedom at Y = ±90° and have many values for one orientation. A quaternion has neither problem and is cheap to compose and renormalize. The trouble is in the parameterization, not the orientation: from the same locked pose, axis–angle input moves normally.
2. **Why are the basis arrows and the matrix columns guaranteed to agree?** Both come from the same `q`. Column 0 of the rotation matrix is `q` applied to +X, which is exactly what the red arrow draws.
3. **Why can the axis–angle readout differ from what you typed, while the box hasn't moved?** `getAxisAngle` always returns an angle in [0°, 180°], so −90° about +Y reads as 90° about −Y. At angle 0 any axis is valid, so the readout shows +X. These are the same rotations.
4. **At Y = 90°, which two sliders do the same thing, and which rings show it?** X and Z. The red and blue rings become coplanar.
5. **Why did the spinning box need interpolation, but the slider-driven box doesn't?** The spinning box changes in fixed physics steps that don't line up with rendered frames. The slider-driven box changes only on user input, and `step` does nothing.
6. **Why does `aether-app` hold the panel as reactive state, and why must the demo pass the panel new objects?** Lit re-renders only when a reactive property changes, and a new demo brings a new panel element that the sidebar has to pick up. Lit compares by identity, so mutating an object and passing it back wouldn't trigger a render.

## What you read

<!-- Which parts of Millington, Box3D and the other Phase 1 resources did you get through? -->

## What surprised you

<!-- What surprised you? What would you do differently? -->
