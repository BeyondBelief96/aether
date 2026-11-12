import { ParticleContact } from "..";

/** A contact pool of `size` empty contacts. */
export function pool(size: number): ParticleContact[] {
    return Array.from({ length: size }, () => new ParticleContact());
}
