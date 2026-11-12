import {
    GroundContacts,
    Particle,
    ParticleRod,
    ParticleWorld,
    Vec3,
    type Vec3Like,
} from "aether-physics";

/**
 * A rigid frame made only of particles and `ParticleRod`s, dropped onto `GroundContacts`. With
 * enough rods a frame keeps its shape and tumbles like a rigid body; without its bracing rods it
 * folds when it lands.
 */

export type FrameShape = "tetrahedron" | "prism" | "cube";

interface ShapeSpec {
    /** Corners, centred on the origin, for an edge of 1 m. */
    readonly corners: readonly Vec3Like[];
    readonly edges: readonly (readonly [number, number])[];
    /** Rods beyond the edges that make the frame rigid. */
    readonly braces: readonly (readonly [number, number])[];
}

const SQRT3 = Math.sqrt(3);
const HALF_DIAGONAL = 1 / (2 * Math.SQRT2);

const SHAPES: Record<FrameShape, ShapeSpec> = {
    tetrahedron: {
        // Alternate corners of a cube with edge 1/√2.
        corners: [
            { x: 1, y: 1, z: 1 },
            { x: 1, y: -1, z: -1 },
            { x: -1, y: 1, z: -1 },
            { x: -1, y: -1, z: 1 },
        ].map(({ x, y, z }) => ({
            x: x * HALF_DIAGONAL,
            y: y * HALF_DIAGONAL,
            z: z * HALF_DIAGONAL,
        })),
        edges: [
            [0, 1],
            [1, 2],
            [2, 0],
            [0, 3],
            [1, 3],
            [2, 3],
        ],
        braces: [],
    },
    prism: {
        corners: [
            { x: -0.5, y: -SQRT3 / 6, z: -0.5 },
            { x: 0.5, y: -SQRT3 / 6, z: -0.5 },
            { x: 0, y: SQRT3 / 3, z: -0.5 },
            { x: -0.5, y: -SQRT3 / 6, z: 0.5 },
            { x: 0.5, y: -SQRT3 / 6, z: 0.5 },
            { x: 0, y: SQRT3 / 3, z: 0.5 },
        ],
        edges: [
            [0, 1],
            [1, 2],
            [2, 0],
            [3, 4],
            [4, 5],
            [5, 3],
            [0, 3],
            [1, 4],
            [2, 5],
        ],
        braces: [
            [0, 4],
            [1, 5],
            [2, 3],
        ],
    },
    cube: {
        corners: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
            x: (i & 1) - 0.5,
            y: ((i >> 1) & 1) - 0.5,
            z: ((i >> 2) & 1) - 0.5,
        })),
        edges: [
            [0, 1],
            [2, 3],
            [4, 5],
            [6, 7],
            [0, 2],
            [1, 3],
            [4, 6],
            [5, 7],
            [0, 4],
            [1, 5],
            [2, 6],
            [3, 7],
        ],
        // One diagonal per face: 12 edges and 6 braces give the 3n − 6 = 18 rods a rigid body
        // of 8 particles needs.
        braces: [
            [0, 3],
            [4, 7],
            [0, 6],
            [1, 7],
            [0, 5],
            [2, 7],
        ],
    },
};

export interface FrameOptions {
    readonly shape: FrameShape;
    /** Whether the bracing rods are included. A tetrahedron has none to remove. */
    readonly braced: boolean;
    /** Length of each edge, in meters. */
    readonly size: number;
    /** Mass of each corner particle, in kilograms. */
    readonly cornerMass: number;
    /** Radius of each corner, in meters; the ground holds corners this far above it. */
    readonly cornerRadius: number;
    readonly restitution: number;
}

const _offset = new Vec3();
const _axis = new Vec3();

export class FrameSim {
    readonly world = new ParticleWorld();
    /** Corner particles of the current frame. */
    readonly particles: Particle[] = [];
    /** Edge rods, then bracing rods. */
    readonly rods: ParticleRod[] = [];
    readonly ground: GroundContacts;
    private corners: readonly Vec3Like[] = [];
    private edges = 0;
    private readonly size: number;
    private readonly cornerMass: number;

    constructor(options: FrameOptions) {
        this.size = options.size;
        this.cornerMass = options.cornerMass;
        this.ground = new GroundContacts(this.particles, options.cornerRadius, options.restitution);
        this.setShape(options.shape, options.braced);
    }

    /** Number of entries at the start of `rods` that are edges. */
    get edgeCount(): number {
        return this.edges;
    }

    /** Replaces the frame with a new one of `shape`. Call `drop` to place it. */
    setShape(shape: FrameShape, braced: boolean): void {
        const spec = SHAPES[shape];
        for (const particle of this.particles) this.world.remove(particle);
        this.particles.length = 0;
        this.corners = spec.corners;
        for (let i = 0; i < spec.corners.length; i++) {
            const particle = new Particle();
            particle.setMass(this.cornerMass);
            particle.damping = 0.99;
            this.particles.push(particle);
        }
        this.drop(0, 0);

        this.rods.length = 0;
        const links = braced ? [...spec.edges, ...spec.braces] : spec.edges;
        for (const [a, b] of links) {
            const pa = this.particles[a]!;
            const pb = this.particles[b]!;
            this.rods.push(new ParticleRod(pa, pb, pa.position.distanceTo(pb.position)));
        }
        this.edges = spec.edges.length;

        this.world.particles.push(...this.particles);
        this.world.contactGenerators.length = 0;
        this.world.contactGenerators.push(this.ground, ...this.rods);
    }

    step(dt: number): void {
        this.world.step(dt);
    }

    /** Rods a rigid frame of this many corners needs: `3n − 6`. */
    get rodsNeeded(): number {
        return 3 * this.particles.length - 6;
    }

    /** Height of the centre of mass above the ground, in meters. */
    centreHeight(): number {
        let sum = 0;
        for (const particle of this.particles) sum += particle.position.y;
        return sum / this.particles.length;
    }

    /**
     * Places the frame with its centre `height` meters up, tipped onto a corner, spinning at
     * `spin` rad/s about a tilted axis, and falling from rest otherwise.
     */
    drop(height: number, spin: number): void {
        // Tipped by fixed angles so it lands on a corner rather than flat on a face.
        const tiltX = 0.6;
        const tiltZ = 0.45;
        _axis.set(0.3, 1, 0.5).normalize();
        this.corners.forEach((corner, i) => {
            _offset.copy(corner).scale(this.size);
            rotateX(_offset, tiltX);
            rotateZ(_offset, tiltZ);
            const particle = this.particles[i]!;
            particle.position.set(_offset.x, _offset.y + height, _offset.z);
            particle.velocity.crossVectors(_axis, _offset).scale(spin);
            particle.lastAcceleration.set(0, 0, 0);
            particle.clearAccumulator();
        });
    }
}

function rotateX(v: Vec3, angle: number): void {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    v.set(v.x, c * v.y - s * v.z, s * v.y + c * v.z);
}

function rotateZ(v: Vec3, angle: number): void {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    v.set(c * v.x - s * v.y, s * v.x + c * v.y, v.z);
}
