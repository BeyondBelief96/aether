import { Particle, ParticleSpring, ParticleWorld } from "aether-physics";

/**
 * A round skin of particles on a square grid, each joined to its four neighbours by a
 * `ParticleSpring` on each end. The springs' rest length is shorter than the grid spacing, so
 * the skin is stretched over the rim, and that tension carries a strike across it as a wave.
 * Particles on the rim are immovable.
 */

export interface DrumheadOptions {
    /** Radius of the rim, in meters. */
    readonly radius: number;
    /** Distance between neighbouring grid points, in meters. */
    readonly spacing: number;
    /** Height of the skin at rest, in meters. */
    readonly height: number;
    /** Mass of each movable particle, in kilograms. */
    readonly mass: number;
    /** Stiffness of each spring, in N/m. */
    readonly stiffness: number;
    /** How much shorter than the spacing each spring's rest length is, as a fraction. */
    readonly tension: number;
    /** Fraction of velocity each particle keeps per second, in [0, 1]. */
    readonly damping: number;
}

/** First zero of the Bessel function J0, which sets a round skin's lowest note. */
const BESSEL_ZERO = 2.405;

export class DrumheadSim {
    readonly world = new ParticleWorld();
    /** Grid points from the centre to the rim along each axis. */
    readonly cells: number;
    /** Grid points along each side: `2 · cells + 1`. */
    readonly side: number;
    /** Every grid point, row-major, `side × side`. `null` outside the rim. */
    readonly grid: readonly (Particle | null)[];
    /** Neighbouring pairs joined by springs, at least one of them movable. */
    readonly links: readonly (readonly [Particle, Particle])[];
    readonly centre: Particle;
    readonly options: DrumheadOptions;
    #tension = 0;

    constructor(options: DrumheadOptions) {
        this.options = options;
        const { radius, spacing } = options;
        this.cells = Math.floor(radius / spacing);
        this.side = 2 * this.cells + 1;
        this.world.gravity.set(0, 0, 0);

        const inside = (i: number, j: number) =>
            Math.abs(i) <= this.cells &&
            Math.abs(j) <= this.cells &&
            (i * i + j * j) * spacing * spacing <= radius ** 2;
        const grid = new Array<Particle | null>(this.side * this.side).fill(null);
        for (let i = -this.cells; i <= this.cells; i++) {
            for (let j = -this.cells; j <= this.cells; j++) {
                if (!inside(i, j)) continue;
                const particle = new Particle();
                particle.position.set(i * spacing, options.height, j * spacing);
                const rim =
                    !inside(i + 1, j) ||
                    !inside(i - 1, j) ||
                    !inside(i, j + 1) ||
                    !inside(i, j - 1);
                if (rim) particle.setMass(Infinity);
                else {
                    particle.setMass(options.mass);
                    this.world.particles.push(particle);
                }
                grid[this.slot(i, j)] = particle;
            }
        }
        this.grid = grid;
        this.centre = grid[this.slot(0, 0)]!;

        const links: [Particle, Particle][] = [];
        for (let i = -this.cells; i <= this.cells; i++) {
            for (let j = -this.cells; j <= this.cells; j++) {
                const a = grid[this.slot(i, j)];
                if (!a) continue;
                for (const b of [
                    inside(i + 1, j) && grid[this.slot(i + 1, j)],
                    inside(i, j + 1) && grid[this.slot(i, j + 1)],
                ]) {
                    if (b && (a.hasFiniteMass() || b.hasFiniteMass())) links.push([a, b]);
                }
            }
        }
        this.links = links;

        this.setTension(options.tension);
        this.setDamping(options.damping);
    }

    /** Index into `grid` of the point `i` cells along x and `j` along z from the centre. */
    slot(i: number, j: number): number {
        return (i + this.cells) * this.side + (j + this.cells);
    }

    get tension(): number {
        return this.#tension;
    }

    /** Rebuilds every spring with a rest length `1 − tension` times the spacing. */
    setTension(tension: number): void {
        this.#tension = tension;
        const { stiffness, spacing } = this.options;
        const registry = this.world.forceRegistry;
        registry.clear();
        const rest = spacing * (1 - tension);
        for (const [a, b] of this.links) {
            if (a.hasFiniteMass()) registry.add(a, new ParticleSpring(b, stiffness, rest));
            if (b.hasFiniteMass()) registry.add(b, new ParticleSpring(a, stiffness, rest));
        }
    }

    setDamping(damping: number): void {
        for (const particle of this.world.particles) particle.damping = damping;
    }

    /**
     * Pushes the skin down around (`x`, `z`), fastest at the centre of the mallet and falling to
     * zero at `reach` meters from it.
     */
    strike(x: number, z: number, reach: number, speed: number): void {
        for (const particle of this.world.particles) {
            const d = Math.hypot(particle.position.x - x, particle.position.z - z);
            if (d >= reach) continue;
            const falloff = Math.cos((Math.PI * d) / (2 * reach)) ** 2;
            particle.velocity.y -= speed * falloff;
        }
    }

    step(dt: number): void {
        this.world.step(dt);
    }

    /** Height of `particle` above the skin at rest, in meters. */
    displacement(particle: Particle): number {
        return particle.position.y - this.options.height;
    }

    /** Force each spring pulls with at rest, in newtons. */
    springTension(): number {
        return this.options.stiffness * this.options.spacing * this.#tension;
    }

    /** Speed of a wave across the skin: √(pull per unit length / mass per unit area), m/s. */
    waveSpeed(): number {
        const { spacing, mass } = this.options;
        return Math.sqrt(this.springTension() / spacing / (mass / spacing ** 2));
    }

    /** Frequency of the skin's lowest mode, in Hz. */
    lowestNote(): number {
        return (BESSEL_ZERO * this.waveSpeed()) / (2 * Math.PI * this.options.radius);
    }
}
