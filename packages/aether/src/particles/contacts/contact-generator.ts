import type { ParticleContact } from "./contact.js";

/** Finds contacts and writes them into a pool owned by the caller. */
export interface ParticleContactGenerator {
    /**
     * Fills `out[start]` onward with `set`, writing no further than `out.length`.
     *
     * @param out Pooled contacts to overwrite.
     * @param start First index to write.
     * @returns Number of contacts written.
     */
    addContacts(out: readonly ParticleContact[], start: number): number;
}
