import type { Particle, ParticleRod } from "aether-physics";
import type { Readout } from "../../core/demo";
import { formatNumber } from "../../core/format";

/** Length error past which a link is flagged, in meters. */
const LENGTH_WARNING = 0.01;

/** Largest difference between a rod's length and its rest length, in meters. */
export function worstRodError(rods: Iterable<ParticleRod>): number {
    let worst = 0;
    for (const rod of rods) worst = Math.max(worst, Math.abs(rod.currentLength() - rod.length));
    return worst;
}

/** A link length error in millimetres, flagged past 1 cm. */
export function lengthErrorReadout(label: string, error: number): Readout {
    return {
        label,
        value: `${formatNumber(error * 1000, 1)} mm`,
        warn: error > LENGTH_WARNING,
    };
}

/** Total kinetic energy of the movable particles in `particles`, in joules. */
export function kineticEnergy(particles: Iterable<Particle>): number {
    let energy = 0;
    for (const p of particles) {
        if (p.inverseMass > 0) energy += 0.5 * p.mass * p.velocity.magnitudeSquared();
    }
    return energy;
}
