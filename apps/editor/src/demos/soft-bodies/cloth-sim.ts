import {
    Particle,
    ParticleSpring,
    ParticleWorld,
    Vec3,
    type ParticleForceGenerator,
} from "aether-physics";

const _wind = new Vec3();

/**
 * Pushes a particle toward the wind's velocity, `k · (wind − v)`, with gusts that travel across
 * the cloth. A user-defined generator: anything with `updateForce` can join the registry.
 */
export class WindForce implements ParticleForceGenerator {
    /** Mean wind speed along +Z, m/s. */
    speed = 0;
    /** Drag coefficient, N·s/m. */
    coefficient = 0.02;
    /** Seconds since the wind started, advanced by the owner. */
    time = 0;

    updateForce(particle: Particle, _dt: number): void {
        if (!particle.hasFiniteMass() || this.speed === 0) return;
        const { x, y } = particle.position;
        const gust =
            1 +
            0.45 * Math.sin(this.time * 2.1 + x * 0.9) +
            0.25 * Math.sin(this.time * 3.7 - y * 1.3);
        _wind.set(0.15 * this.speed * Math.sin(this.time * 0.7), 0, this.speed * gust);
        particle.addForce(_wind.subtract(particle.velocity).scale(this.coefficient));
    }
}

export type PinMode = "corners" | "edge" | "one";

export interface ClothOptions {
    /** Particles along each side. */
    readonly size: number;
    /** Distance between neighbours at rest, m. */
    readonly spacing: number;
    /** Mass of each particle, kg. */
    readonly mass: number;
    /** Height of the top edge, m. */
    readonly top: number;
}

/**
 * A square cloth: particles on a grid joined by structural springs (to each side neighbour)
 * and shear springs (to each diagonal neighbour), one `ParticleSpring` on each end of a link.
 */
export class ClothSim {
    readonly world = new ParticleWorld();
    readonly wind = new WindForce();
    readonly options: ClothOptions;
    /** Row-major, top row first. */
    readonly particles: Particle[] = [];
    /** Index pairs of every link. */
    readonly links: [number, number, number][] = [];
    #pinned = new Set<number>();
    #stiffness = 0;

    constructor(options: ClothOptions) {
        this.options = options;
        const { size, spacing } = options;
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const particle = new Particle();
                particle.setMass(options.mass);
                this.particles.push(particle);
                this.world.particles.push(particle);
            }
        }
        const at = (row: number, col: number) => row * size + col;
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (col + 1 < size) this.links.push([at(row, col), at(row, col + 1), spacing]);
                if (row + 1 < size) this.links.push([at(row, col), at(row + 1, col), spacing]);
                if (row + 1 < size && col + 1 < size)
                    this.links.push([at(row, col), at(row + 1, col + 1), spacing * Math.SQRT2]);
                if (row + 1 < size && col > 0)
                    this.links.push([at(row, col), at(row + 1, col - 1), spacing * Math.SQRT2]);
            }
        }
        this.reset();
    }

    /** Lays the cloth flat in the XY plane, hanging from its top edge, at rest. */
    reset(): void {
        const { size, spacing, top } = this.options;
        const width = (size - 1) * spacing;
        this.particles.forEach((p, i) => {
            const row = Math.floor(i / size);
            const col = i % size;
            p.position.set(col * spacing - width / 2, top - row * spacing, 0);
            p.velocity.set(0, 0, 0);
            p.clearAccumulator();
        });
        this.wind.time = 0;
    }

    /** Indices of the pinned particles. */
    get pinned(): ReadonlySet<number> {
        return this.#pinned;
    }

    setPins(mode: PinMode): void {
        const { size } = this.options;
        const pins =
            mode === "edge"
                ? Array.from({ length: size }, (_, i) => i)
                : mode === "one"
                  ? [0]
                  : [0, size - 1];
        this.#pinned = new Set(pins);
        this.particles.forEach((p, i) => {
            if (this.#pinned.has(i)) p.setMass(Infinity);
            else if (!p.hasFiniteMass()) p.setMass(this.options.mass);
        });
    }

    /** Rebuilds every spring with a new stiffness, N/m. */
    setStiffness(stiffness: number): void {
        this.#stiffness = stiffness;
        const registry = this.world.forceRegistry;
        registry.clear();
        for (const [a, b, rest] of this.links) {
            const pa = this.particles[a]!;
            const pb = this.particles[b]!;
            registry.add(pa, new ParticleSpring(pb, stiffness, rest));
            registry.add(pb, new ParticleSpring(pa, stiffness, rest));
        }
        for (const p of this.particles) registry.add(p, this.wind);
    }

    get stiffness(): number {
        return this.#stiffness;
    }

    setDamping(damping: number): void {
        for (const p of this.particles) p.damping = damping;
    }

    /** Advances by `dt` in `substeps` equal steps. */
    step(dt: number, substeps: number): void {
        const h = dt / substeps;
        for (let i = 0; i < substeps; i++) {
            this.world.step(h);
            this.wind.time += h;
        }
    }

    /** Largest link length over its rest length, minus one. */
    maxStretch(): number {
        let max = 0;
        for (const [a, b, rest] of this.links) {
            const length = this.particles[a]!.position.distanceTo(this.particles[b]!.position);
            max = Math.max(max, length / rest - 1);
        }
        return max;
    }
}
