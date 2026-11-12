import { Vec3, type Particle } from "aether-physics";

const _blended = new Vec3();

/**
 * Particle positions blended between the last two steps, so a frame drawn between steps sits
 * where the particles would be at that moment.
 */
export class StepBlend {
    private readonly previous = new Map<Particle, Vec3>();
    private alpha = 1;

    /** Records the positions of `particles` before a step. */
    remember(particles: Iterable<Particle>): void {
        for (const particle of particles) {
            const previous = this.previous.get(particle);
            if (previous) previous.copy(particle.position);
            else this.previous.set(particle, particle.position.clone());
        }
    }

    /** Forgets every recorded position, then records `particles` as they are now. */
    reset(particles: Iterable<Particle>): void {
        this.previous.clear();
        this.remember(particles);
    }

    /** Drops `particle`'s recorded position, for a particle taken out of the scene. */
    forget(particle: Particle): void {
        this.previous.delete(particle);
    }

    /** Sets how far between the last two steps `positionOf` reads, in [0, 1]. */
    blend(alpha: number): void {
        this.alpha = alpha;
    }

    /**
     * `particle`'s blended position, written to `out`, which defaults to a scratch vector shared
     * by every call. A particle never remembered is at its current position.
     */
    readonly positionOf = (particle: Particle, out: Vec3 = _blended): Vec3 => {
        const previous = this.previous.get(particle);
        if (!previous) return out.copy(particle.position);
        return out.copy(previous).lerp(particle.position, this.alpha);
    };
}
