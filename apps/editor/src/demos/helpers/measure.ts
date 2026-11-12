import type { Particle, ParticleRod } from "aether-physics";

/** Largest difference between a rod's length and its rest length, in meters. */
export function worstRodError(rods: Iterable<ParticleRod>): number {
    let worst = 0;
    for (const rod of rods) worst = Math.max(worst, Math.abs(rod.currentLength() - rod.length));
    return worst;
}

/** Total kinetic energy of the movable particles in `particles`, in joules. */
export function kineticEnergy(particles: Iterable<Particle>): number {
    let energy = 0;
    for (const p of particles) {
        if (p.inverseMass > 0) energy += 0.5 * p.mass * p.velocity.magnitudeSquared();
    }
    return energy;
}
