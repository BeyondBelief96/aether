# math (Phase 1)

`Vec3`, `Mat3x3`, `Mat3x4` (3×4 affine), `Quaternion`. Pure TypeScript, no `three` imports.

Write a test for every operation before using it.

See [PLAN.md, Phase 1](../../docs/PLAN.md#phase-1-math-library).

## Public API conventions

- Import math through `index.ts` (`from '../math'`), never from individual files.
- Public methods take `Vec3Like` (any `{ x, y, z }`, including `THREE.Vector3`) as input and return concrete engine types such as `Vec3`.
- `src/index.ts` is the package entry point. Only engine and math exports go there.

## API decisions

### Mutable methods with `out` parameters

Methods that change an object do it in place and return `this` for chaining (`v.add(w).scale(2)`). Methods that produce a different type, such as a matrix transforming a vector, write into an optional `out` and allocate one only when it is omitted. Use `clone()` when you need a copy. This keeps the solver's inner loops free of allocation.

Every method reads its inputs into locals before writing, so arguments may alias `this` or `out` (`v.cross(v)`, `m.multiply(m)`).

### Matrices: row-major storage, column vectors

`elements[row * cols + col]`, transformed as `M · v`. In `A · B`, `B` applies first. Three.js is column-major, so build Three.js transforms from a position and quaternion, never by copying `elements`.

### Singular inverses become the zero matrix

`Mat3x3.setInverse` / `inverse` and `Mat3x4.setInverse` / `inverse` write all zeros when the determinant is exactly `0`, and still return `this` so they chain like every other method.

Why zero rather than returning `false` (the PLAN sketch's `invert(): boolean`):

- It keeps the inverse methods consistent with the rest of the chaining API.
- A zero inverse is the physically meaningful fallback for the main caller, the inverse inertia tensor: it makes a body impossible to rotate, the rotational equivalent of `inverseMass = 0`.

Costs to keep in mind:

- **The failure is silent.** Callers that need to know should check `determinant()` first. Infinite-inertia bodies should set the inverse tensor to zero directly instead of inverting a singular tensor by accident.
- **The check is exact.** A nearly singular matrix still inverts, producing huge values instead of zero. A tolerance would have to be scale-aware (the determinant scales with the cube of the elements), so it is left to callers until a real case needs it.

### Orthonormal shortcuts

Methods named `*Orthonormal`, and `transformInverse*`, use the transpose as the inverse. They are only correct for pure rotations and reflections; with scale or shear the result is undefined. Prefer them on hot paths for rigid transforms.
