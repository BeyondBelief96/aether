import {
    GroundContacts,
    Particle,
    ParticleWorld,
    Vec3,
    type ParticleContact,
    type ParticleContactGenerator,
} from "aether-physics";

/**
 * A rack of equal balls on a table, broken by a cue ball. The table top is a `GroundContacts`;
 * the cushions and the ball–ball pairs are generators defined here, since the engine has no
 * sphere collision for particles. Every contact goes through the engine's worst-first resolver.
 */

/**
 * Balls closer than this count as touching, in meters. Racked balls start exactly touching, and
 * without a margin the resolver would never see the contacts between them.
 */
const TOUCH_MARGIN = 1e-4;
const UP = Object.freeze({ x: 0, y: 1, z: 0 });
const CUSHIONS = Object.freeze([
    { axis: "x", sign: 1, normal: Object.freeze({ x: 1, y: 0, z: 0 }) },
    { axis: "x", sign: -1, normal: Object.freeze({ x: -1, y: 0, z: 0 }) },
    { axis: "z", sign: 1, normal: Object.freeze({ x: 0, y: 0, z: 1 }) },
    { axis: "z", sign: -1, normal: Object.freeze({ x: 0, y: 0, z: -1 }) },
] as const);

const _normal = new Vec3();

/** Contacts between every touching or overlapping pair of equal spheres, tested brute force. */
export class SphereContacts implements ParticleContactGenerator {
    particles: readonly Particle[];
    radius: number;
    restitution: number;

    constructor(particles: readonly Particle[], radius: number, restitution: number) {
        this.particles = particles;
        this.radius = radius;
        this.restitution = restitution;
    }

    addContacts(out: readonly ParticleContact[], start: number): number {
        const { particles } = this;
        const reach = 2 * this.radius;
        const touch = reach + TOUCH_MARGIN;
        let index = start;
        for (let i = 0; i < particles.length; i++) {
            const a = particles[i]!.position;
            for (let j = i + 1; j < particles.length; j++) {
                if (index >= out.length) return index - start;
                const b = particles[j]!.position;
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dz = a.z - b.z;
                const squared = dx * dx + dy * dy + dz * dz;
                if (squared >= touch * touch) continue;
                const distance = Math.sqrt(squared);
                const normal = distance > 0 ? _normal.set(dx, dy, dz).scale(1 / distance) : UP;
                out[index++]!.set(
                    particles[i]!,
                    particles[j]!,
                    normal,
                    reach - distance,
                    this.restitution,
                );
            }
        }
        return index - start;
    }
}

/** Contacts that keep spheres inside a rectangle of cushions at `±halfLength` on x, `±halfWidth` on z. */
export class Cushions implements ParticleContactGenerator {
    particles: readonly Particle[];
    radius: number;
    halfLength: number;
    halfWidth: number;
    restitution: number;

    constructor(
        particles: readonly Particle[],
        radius: number,
        halfLength: number,
        halfWidth: number,
        restitution: number,
    ) {
        this.particles = particles;
        this.radius = radius;
        this.halfLength = halfLength;
        this.halfWidth = halfWidth;
        this.restitution = restitution;
    }

    addContacts(out: readonly ParticleContact[], start: number): number {
        const limitX = this.halfLength - this.radius;
        const limitZ = this.halfWidth - this.radius;
        let index = start;
        for (const particle of this.particles) {
            for (const { axis, sign, normal } of CUSHIONS) {
                if (index >= out.length) return index - start;
                const limit = axis === "x" ? limitX : limitZ;
                const depth = -limit - sign * particle.position[axis];
                if (!(depth > 0)) continue;
                out[index++]!.set(particle, null, normal, depth, this.restitution);
            }
        }
        return index - start;
    }
}

export interface BreakOptions {
    readonly radius: number;
    readonly halfLength: number;
    readonly halfWidth: number;
    /** Rows in the triangular rack, 1 to `MAX_ROWS`: 5 rows is 15 balls. */
    readonly rows: number;
    readonly restitution: number;
    /** Fraction of velocity each ball keeps per second, in [0, 1]. */
    readonly damping: number;
}

/** Where the rack's apex sits, as a fraction of the half-length past the centre. */
const RACK_APEX = 0.25;

/** Most rows a rack can have. */
export const MAX_ROWS = 6;

/** Balls on the table with a rack of `rows` rows, cue ball included. */
function ballCount(rows: number): number {
    return 1 + (rows * (rows + 1)) / 2;
}

/** Every pair, the table and two cushions per ball, for the largest rack. */
const MAX_CONTACTS =
    (ballCount(MAX_ROWS) * (ballCount(MAX_ROWS) - 1)) / 2 + 3 * ballCount(MAX_ROWS);

/** The table's balls, world and generators. The cue ball is `particles[0]`. */
export class BreakSim {
    readonly particles: Particle[] = [];
    readonly radius: number;
    readonly halfLength: number;
    readonly halfWidth: number;
    readonly world: ParticleWorld;
    private readonly table: GroundContacts;
    private readonly cushions: Cushions;
    private readonly pairs: SphereContacts;
    private rows: number;
    private damping: number;
    private peak = 0;

    constructor(options: BreakOptions) {
        this.radius = options.radius;
        this.halfLength = options.halfLength;
        this.halfWidth = options.halfWidth;
        this.rows = options.rows;
        this.damping = options.damping;
        this.world = new ParticleWorld({ maxContacts: MAX_CONTACTS });
        this.table = new GroundContacts(this.particles, options.radius, 0);
        this.cushions = new Cushions(
            this.particles,
            options.radius,
            options.halfLength,
            options.halfWidth,
            options.restitution,
        );
        this.pairs = new SphereContacts(this.particles, options.radius, options.restitution);
        this.world.contactGenerators.push(this.table, this.cushions, this.pairs);
        this.rack(options.rows);
    }

    /** Most contacts found in one step since the last rack. */
    get peakContacts(): number {
        return this.peak;
    }

    setRestitution(restitution: number): void {
        this.cushions.restitution = restitution;
        this.pairs.restitution = restitution;
    }

    setDamping(damping: number): void {
        this.damping = damping;
        for (const particle of this.particles) particle.damping = damping;
    }

    /**
     * Places the cue ball and a triangle of `rows` rows, every ball touching its neighbours, with
     * the apex toward the cue ball. Every ball starts at rest.
     *
     * @throws RangeError If `rows` is not an integer from 1 to `MAX_ROWS`.
     */
    rack(rows = this.rows): void {
        if (!(Number.isInteger(rows) && rows >= 1 && rows <= MAX_ROWS)) {
            throw new RangeError(`rows must be an integer from 1 to ${MAX_ROWS}, got ${rows}`);
        }
        this.rows = rows;
        const count = ballCount(rows);
        while (this.particles.length > count) this.world.remove(this.particles.pop()!);
        while (this.particles.length < count) {
            const particle = new Particle();
            particle.damping = this.damping;
            this.particles.push(particle);
            this.world.particles.push(particle);
        }

        const r = this.radius;
        const apex = this.halfLength * RACK_APEX;
        this.particles[0]!.position.set(-this.halfLength * 0.55, r, 0);
        let index = 1;
        for (let row = 0; row < rows; row++) {
            for (let k = 0; k <= row; k++) {
                this.particles[index++]!.position.set(
                    apex + row * r * Math.sqrt(3),
                    r,
                    (k - row / 2) * 2 * r,
                );
            }
        }
        for (const particle of this.particles) {
            particle.velocity.set(0, 0, 0);
            particle.lastAcceleration.set(0, 0, 0);
        }
        this.peak = 0;
    }

    /**
     * Sends the cue ball toward the apex of the rack.
     *
     * @param speed Speed in m/s.
     * @param aim Angle from the +x axis toward +z, in radians.
     */
    shoot(speed: number, aim = 0): void {
        this.particles[0]!.velocity.set(speed * Math.cos(aim), 0, speed * Math.sin(aim));
    }

    step(dt: number): void {
        this.world.step(dt);
        this.peak = Math.max(this.peak, this.world.contactCount);
    }

    /** Largest overlap between two balls, measured from their positions, in meters. */
    deepestOverlap(): number {
        const reach = 2 * this.radius;
        let deepest = 0;
        for (let i = 0; i < this.particles.length; i++) {
            const a = this.particles[i]!.position;
            for (let j = i + 1; j < this.particles.length; j++) {
                const b = this.particles[j]!.position;
                const distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
                deepest = Math.max(deepest, reach - distance);
            }
        }
        return deepest;
    }
}
