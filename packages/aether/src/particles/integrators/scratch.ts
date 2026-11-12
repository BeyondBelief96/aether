import { Vec3 } from "../../math/index.js";

/** Grows `vectors` to at least `length` entries. */
export function ensureLength(vectors: Vec3[], length: number): void {
    while (vectors.length < length) vectors.push(new Vec3());
}
