import {
    Particle,
    ParticleBuoyancy,
    ParticleSpring,
    ParticleWorld,
    Vec3,
    type Vec3Like,
} from "aether-physics";

/**
 * A log raft as a two-layer truss of particles: a node on each log, a deck node above it, and
 * `ParticleSpring`s along, across and diagonally through both layers so the raft resists
 * bending. Only the log nodes float, each with its own `ParticleBuoyancy`. A crate hangs on
 * springs from the four deck nodes around it, so its weight bends and tips the raft where it
 * sits. The lake bed is a clamp on every particle's height.
 */

export interface RaftOptions {
    /** Nodes along each log. */
    readonly along: number;
    readonly logs: number;
    /** Distance between nodes along a log, in meters. */
    readonly stepX: number;
    /** Distance between logs, in meters. */
    readonly stepZ: number;
    /** Radius of each log, in meters. */
    readonly logRadius: number;
    /** Height of the deck nodes above the log nodes, in meters. */
    readonly deck: number;
    /** Mass of a deck node as a fraction of a log node's. */
    readonly deckShare: number;
    /** Stiffness of the raft's springs, in N/m. */
    readonly stiffness: number;
    /** Stiffness of a crate's springs per kilogram of crate, in N/m. */
    readonly crateRate: number;
    /** Edge of a crate, in meters. */
    readonly crateSize: number;
    readonly maxCrates: number;
    /** Depth of the lake bed below the surface, in meters. */
    readonly lakeDepth: number;
    /** Gravitational acceleration, in m/s². */
    readonly gravity: number;
    /** Density of the logs, in kg/m³. */
    readonly wood: number;
    /** Fraction of velocity each particle keeps per second, in [0, 1]. */
    readonly damping: number;
}

export interface RaftCrate {
    readonly particle: Particle;
    /** Deck cell the crate stands on. */
    readonly cell: number;
    /** Each spring and the particle it is registered on. */
    readonly springs: readonly (readonly [Particle, ParticleSpring])[];
}

const WATER_DENSITY = 1000; // kg/m³
/** How far above the lake bed the clamp holds a particle, in meters. */
const BED_CLEARANCE = 0.2;
/** Gap between a new crate and the deck, in meters. */
const CRATE_GAP = 0.06;

const _edgeX = new Vec3();
const _edgeZ = new Vec3();
const _centre = new Vec3();

export class RaftSim {
    readonly world = new ParticleWorld();
    readonly options: RaftOptions;
    /** Log nodes, indexed `[log][along]`. */
    readonly logs: readonly (readonly Particle[])[];
    /** Deck nodes above the log nodes, indexed `[log][along]`. */
    readonly deck: readonly (readonly Particle[])[];
    /** Crates on the deck, oldest first. */
    readonly crates: RaftCrate[] = [];
    /** Volume of water one log node displaces when fully under, in m³. */
    readonly logVolume: number;
    #damping: number;

    constructor(options: RaftOptions) {
        this.options = options;
        const { along, logs, stepX, stepZ, stiffness } = options;
        this.world.gravity.set(0, -options.gravity, 0);
        this.logVolume = Math.PI * options.logRadius ** 2 * stepX;
        this.#damping = options.damping;

        const makeLayer = (y: number) =>
            Array.from({ length: logs }, (_, k) =>
                Array.from({ length: along }, (_, i) => {
                    const p = new Particle();
                    p.position.set((i - (along - 1) / 2) * stepX, y, (k - (logs - 1) / 2) * stepZ);
                    this.world.particles.push(p);
                    return p;
                }),
            );
        const logNodes = makeLayer(0.2);
        const deckNodes = makeLayer(0.2 + options.deck);
        this.logs = logNodes;
        this.deck = deckNodes;

        for (const layer of [logNodes, deckNodes]) {
            for (let k = 0; k < logs; k++) {
                for (let i = 0; i < along; i++) {
                    const node = layer[k]![i]!;
                    if (i + 1 < along) this.#link(node, layer[k]![i + 1]!, stiffness);
                    if (k + 1 < logs) this.#link(node, layer[k + 1]![i]!, stiffness);
                    if (i + 1 < along && k + 1 < logs) {
                        this.#link(node, layer[k + 1]![i + 1]!, stiffness);
                        this.#link(layer[k]![i + 1]!, layer[k + 1]![i]!, stiffness);
                    }
                }
            }
        }
        for (let k = 0; k < logs; k++) {
            for (let i = 0; i < along; i++) {
                const log = logNodes[k]![i]!;
                this.#link(log, deckNodes[k]![i]!, stiffness);
                if (i + 1 < along) this.#link(log, deckNodes[k]![i + 1]!, stiffness);
                if (i > 0) this.#link(log, deckNodes[k]![i - 1]!, stiffness);
                if (k + 1 < logs) this.#link(log, deckNodes[k + 1]![i]!, stiffness);
                if (k > 0) this.#link(log, deckNodes[k - 1]![i]!, stiffness);
            }
        }
        const floats = new ParticleBuoyancy(
            options.logRadius,
            this.logVolume,
            0,
            WATER_DENSITY,
            options.gravity,
        );
        for (const log of logNodes.flat()) this.world.forceRegistry.add(log, floats);

        this.setWood(options.wood);
        this.setDamping(options.damping);
    }

    /** Sets the density of the logs, in kg/m³. Deck nodes weigh `deckShare` of a log node. */
    setWood(density: number): void {
        const logMass = density * this.logVolume;
        for (const log of this.logs.flat()) log.setMass(logMass);
        for (const node of this.deck.flat()) node.setMass(logMass * this.options.deckShare);
    }

    setDamping(damping: number): void {
        this.#damping = damping;
        for (const p of this.world.particles) p.damping = damping;
    }

    /** Steps the world, then holds every particle above the lake bed. */
    step(dt: number): void {
        this.world.step(dt);
        const floor = -this.options.lakeDepth + BED_CLEARANCE;
        for (const p of this.world.particles) {
            if (p.position.y >= floor) continue;
            p.position.y = floor;
            if (p.velocity.y < 0) p.velocity.y = 0;
        }
    }

    /** Number of deck cells, each between four deck nodes. */
    get cellCount(): number {
        return (this.options.along - 1) * (this.options.logs - 1);
    }

    /** The four deck nodes around `cell`: two along one log, then two along the next. */
    cellCorners(cell: number): [Particle, Particle, Particle, Particle] {
        const k = Math.floor(cell / (this.options.along - 1));
        const i = cell % (this.options.along - 1);
        const row = this.deck[k]!;
        const next = this.deck[k + 1]!;
        return [row[i]!, row[i + 1]!, next[i]!, next[i + 1]!];
    }

    /** Middle of `cell`'s four corners, written to `out`. */
    cellCentre(cell: number, out: Vec3): Vec3 {
        out.set(0, 0, 0);
        for (const corner of this.cellCorners(cell)) out.add(corner.position);
        return out.scale(0.25);
    }

    /** Cells with no crate on them. */
    freeCells(): number[] {
        const taken = new Set(this.crates.map((c) => c.cell));
        const cells: number[] = [];
        for (let c = 0; c < this.cellCount; c++) if (!taken.has(c)) cells.push(c);
        return cells;
    }

    /** The free cell whose centre is nearest `point`, or `undefined` when none is free. */
    nearestFreeCell(point: Vec3Like): number | undefined {
        let best: number | undefined;
        let bestDistance = Infinity;
        for (const cell of this.freeCells()) {
            const d = this.cellCentre(cell, _centre).distanceTo(point);
            if (d < bestDistance) {
                bestDistance = d;
                best = cell;
            }
        }
        return best;
    }

    /**
     * Sets a crate of `mass` kilograms on `cell`, hung from the cell's corners. Returns `null`
     * when the deck is full, the cell is taken, or the raft has blown up.
     */
    addCrate(cell: number, mass: number): RaftCrate | null {
        if (this.crates.length >= this.options.maxCrates) return null;
        if (this.crates.some((c) => c.cell === cell)) return null;
        const particle = new Particle();
        particle.setMass(mass);
        particle.damping = this.#damping;
        const corners = this.cellCorners(cell);
        // Raised along the deck's normal so it sits on the deck however the raft is tilted.
        this.cellCentre(cell, particle.position);
        _edgeX.copy(corners[1].position).subtract(corners[0].position);
        _edgeZ.copy(corners[2].position).subtract(corners[0].position);
        _centre.crossVectors(_edgeZ, _edgeX).normalize();
        particle.position.addScaled(_centre, this.options.crateSize / 2 + CRATE_GAP);
        particle.velocity.copy(corners[0].velocity);
        if (!Number.isFinite(particle.position.magnitudeSquared())) return null;
        const springs = corners.flatMap((corner) =>
            this.#link(particle, corner, this.options.crateRate * mass),
        );
        this.world.particles.push(particle);
        const crate = { particle, cell, springs };
        this.crates.push(crate);
        return crate;
    }

    /** Takes the newest crate off the deck and returns it. */
    removeCrate(): RaftCrate | undefined {
        const crate = this.crates.pop();
        if (!crate) return undefined;
        for (const [owner, spring] of crate.springs) this.world.forceRegistry.remove(owner, spring);
        this.world.remove(crate.particle);
        return crate;
    }

    /** Mass of every particle, raft and crates, in kilograms. */
    totalMass(): number {
        return this.world.particles.reduce((sum, p) => sum + p.mass, 0);
    }

    /** Mass of the crates, in kilograms. */
    cargo(): number {
        return this.crates.reduce((sum, c) => sum + c.particle.mass, 0);
    }

    /** Mass of water the logs displace when fully under, in kilograms. */
    fullBuoyancy(): number {
        return this.options.logs * this.options.along * this.logVolume * WATER_DENSITY;
    }

    /** Angle of the deck from level, in radians. */
    tilt(): number {
        const { along, logs } = this.options;
        const first = this.deck[0]!;
        _edgeX.copy(first[along - 1]!.position).subtract(first[0]!.position);
        _edgeZ.copy(this.deck[logs - 1]![0]!.position).subtract(first[0]!.position);
        _centre.crossVectors(_edgeZ, _edgeX).normalize();
        return Math.acos(Math.min(1, Math.abs(_centre.y)));
    }

    /** Height of the lowest deck node above the water, in meters. */
    freeboard(): number {
        return Math.min(...this.deck.flat().map((p) => p.position.y));
    }

    /** Joins `a` and `b` with a spring on each end at their current distance. */
    #link(a: Particle, b: Particle, stiffness: number): [Particle, ParticleSpring][] {
        const rest = a.position.distanceTo(b.position);
        const onA = new ParticleSpring(b, stiffness, rest);
        const onB = new ParticleSpring(a, stiffness, rest);
        this.world.forceRegistry.add(a, onA);
        this.world.forceRegistry.add(b, onB);
        return [
            [a, onA],
            [b, onB],
        ];
    }
}
