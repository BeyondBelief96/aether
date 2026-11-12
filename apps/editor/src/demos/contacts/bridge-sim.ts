import {
    Particle,
    Vec3,
    ParticleCable,
    ParticleRod,
    ParticleWorld,
    type ParticleContactGenerator,
    type Vec3Like,
} from "aether-physics";

const _point = new Vec3();

/**
 * A rope bridge built only from contact generators: two rails of particles joined along their
 * length by `ParticleCable`s and across by `ParticleRod`s, fixed at both ends, with optional
 * hanger cables from anchors overhead. A load moves along the deck by adding its mass to the
 * particles around it.
 */

export interface BridgeOptions {
    /** Sections along the span; each rail has `sections + 1` particles. */
    readonly sections: number;
    /** Distance between the fixed ends, in meters. */
    readonly span: number;
    /** Distance between the rails, in meters. */
    readonly width: number;
    /** Height of the fixed ends, in meters. */
    readonly deckHeight: number;
    /** Height of the hanger anchors above the fixed ends, in meters. */
    readonly hangerHeight: number;
    /** How far below the fixed ends a hanger lets its particle drop, in meters. */
    readonly hangerDrop: number;
    /** Mass of each deck particle, in kilograms. */
    readonly nodeMass: number;
    /** Fraction of velocity each particle keeps per second, in [0, 1]. */
    readonly damping: number;
    /** Extra length of each rail cable over the section length, as a fraction. */
    readonly slack: number;
    readonly hangers: boolean;
    /** Fixed resolver iterations, or `undefined` for twice the contact count. */
    readonly iterations: number | undefined;
}

export class BridgeSim {
    /** Deck particles, rail 0 then rail 1, ordered along the span. The end particles are fixed. */
    readonly particles: Particle[] = [];
    /** One rod across the deck at every movable section. */
    readonly rods: ParticleRod[] = [];
    /** Cables along each rail between neighbouring particles. */
    readonly railCables: ParticleCable[] = [];
    /** Cables from fixed anchors overhead down to each movable deck particle. */
    readonly hangerCables: ParticleCable[] = [];
    /** Fixed particles the hangers hang from, in the same order as `hangerCables`. */
    readonly anchors: Particle[] = [];
    readonly sections: number;
    readonly span: number;
    readonly world: ParticleWorld;
    /** Load in kilograms. */
    loadMass = 0;
    /** Speed of the load along the span in m/s. Zero parks it. */
    loadSpeed = 0;
    /** Distance of the load from the first end, in meters. */
    loadPosition = 0;
    private direction = 1;
    private readonly nodeMass: number;
    private readonly spacing: number;
    private hangersOn: boolean;

    constructor(options: BridgeOptions) {
        const { sections, span, width, deckHeight, nodeMass } = options;
        this.sections = sections;
        this.span = span;
        this.nodeMass = nodeMass;
        this.spacing = span / sections;
        this.hangersOn = options.hangers;

        for (let rail = 0; rail < 2; rail++) {
            for (let i = 0; i <= sections; i++) {
                const particle = new Particle();
                particle.position.set(this.xAt(i), deckHeight, (rail - 0.5) * width);
                if (i === 0 || i === sections) particle.inverseMass = 0;
                else particle.setMass(nodeMass);
                particle.damping = options.damping;
                this.particles.push(particle);
            }
        }

        for (let rail = 0; rail < 2; rail++) {
            for (let i = 0; i < sections; i++) {
                this.railCables.push(
                    new ParticleCable(this.node(rail, i), this.node(rail, i + 1), this.spacing),
                );
            }
        }
        for (let i = 1; i < sections; i++) {
            this.rods.push(new ParticleRod(this.node(0, i), this.node(1, i), width));
            for (let rail = 0; rail < 2; rail++) {
                const deck = this.node(rail, i);
                const anchor = new Particle();
                anchor.inverseMass = 0;
                anchor.position.copy(deck.position).y += options.hangerHeight;
                this.anchors.push(anchor);
                this.hangerCables.push(
                    new ParticleCable(anchor, deck, options.hangerHeight + options.hangerDrop),
                );
            }
        }

        this.setSlack(options.slack);
        this.world = new ParticleWorld({ resolverIterations: options.iterations });
        this.world.particles.push(...this.particles);
        this.syncGenerators();
    }

    /** The deck particle at section `i` on rail `rail` (0 or 1). */
    node(rail: number, i: number): Particle {
        return this.particles[rail * (this.sections + 1) + i]!;
    }

    get hangers(): boolean {
        return this.hangersOn;
    }

    setSlack(slack: number): void {
        for (const cable of this.railCables) cable.maxLength = this.spacing * (1 + slack);
    }

    setDamping(damping: number): void {
        for (const particle of this.particles) particle.damping = damping;
    }

    setHangers(on: boolean): void {
        this.hangersOn = on;
        this.syncGenerators();
    }

    /** Moves the load, spreads its mass over the deck particles around it and steps the world. */
    step(dt: number): void {
        this.moveLoad(dt);
        this.spreadLoad();
        this.world.step(dt);
    }

    /** Section the load is on, from 0 to `sections - 1`. */
    loadSection(): number {
        return Math.min(Math.floor(this.loadPosition / this.spacing), this.sections - 1);
    }

    /** How far along its section the load is, in [0, 1]. */
    loadFraction(): number {
        return this.loadPosition / this.spacing - this.loadSection();
    }

    /** Largest difference between a rod's length and its rest length, in meters. */
    rodError(): number {
        let worst = 0;
        for (const rod of this.rods) {
            worst = Math.max(worst, Math.abs(rod.currentLength() - rod.length));
        }
        return worst;
    }

    /** Largest distance any active cable is stretched past its length, in meters. */
    cableStretch(): number {
        let worst = 0;
        for (const cable of this.activeCables()) {
            worst = Math.max(worst, cable.currentLength() - cable.maxLength);
        }
        return worst;
    }

    /** Active cables within `tolerance` meters of their length. */
    tautCount(tolerance: number): number {
        let count = 0;
        for (const cable of this.activeCables()) {
            if (cable.currentLength() >= cable.maxLength - tolerance) count++;
        }
        return count;
    }

    /** Number of cables in use: the rails, plus the hangers when they are on. */
    cableCount(): number {
        return this.railCables.length + (this.hangersOn ? this.hangerCables.length : 0);
    }

    /**
     * The point on the deck's centre line under the load, interpolated between the particles
     * around it.
     *
     * @param positionOf Position to use for a deck particle, such as an interpolated one.
     */
    loadPoint(out: Vec3, positionOf: (index: number) => Vec3Like = this.positionOf): Vec3 {
        const section = this.loadSection();
        const t = this.loadFraction();
        out.set(0, 0, 0);
        for (let rail = 0; rail < 2; rail++) {
            const near = rail * (this.sections + 1) + section;
            out.addScaled(positionOf(near), (1 - t) / 2);
            out.addScaled(positionOf(near + 1), t / 2);
        }
        return out;
    }

    /** How far the deck under the load sits below the fixed ends, in meters. */
    dropUnderLoad(): number {
        return this.particles[0]!.position.y - this.loadPoint(_point).y;
    }

    /** Lowest point of the deck below the fixed ends, in meters. */
    sag(): number {
        const top = this.particles[0]!.position.y;
        let lowest = top;
        for (const particle of this.particles) lowest = Math.min(lowest, particle.position.y);
        return top - lowest;
    }

    private *activeCables(): Generator<ParticleCable> {
        yield* this.railCables;
        if (this.hangersOn) yield* this.hangerCables;
    }

    private xAt(i: number): number {
        return -this.span / 2 + i * this.spacing;
    }

    private moveLoad(dt: number): void {
        if (!(this.loadSpeed > 0)) return;
        this.loadPosition += this.direction * this.loadSpeed * dt;
        if (this.loadPosition >= this.span) {
            this.loadPosition = 2 * this.span - this.loadPosition;
            this.direction = -1;
        } else if (this.loadPosition <= 0) {
            this.loadPosition = -this.loadPosition;
            this.direction = 1;
        }
        this.loadPosition = Math.min(Math.max(this.loadPosition, 0), this.span);
    }

    private spreadLoad(): void {
        for (const particle of this.particles) {
            if (particle.inverseMass > 0) particle.setMass(this.nodeMass);
        }
        if (!(this.loadMass > 0)) return;
        const section = this.loadSection();
        const t = this.loadFraction();
        for (let rail = 0; rail < 2; rail++) {
            this.addMass(this.node(rail, section), (this.loadMass * (1 - t)) / 2);
            this.addMass(this.node(rail, section + 1), (this.loadMass * t) / 2);
        }
    }

    private addMass(particle: Particle, mass: number): void {
        if (particle.inverseMass > 0) particle.setMass(particle.mass + mass);
    }

    private readonly positionOf = (index: number): Vec3Like => this.particles[index]!.position;

    private syncGenerators(): void {
        const generators: ParticleContactGenerator[] = this.world.contactGenerators;
        generators.length = 0;
        generators.push(...this.rods, ...this.railCables);
        if (this.hangersOn) generators.push(...this.hangerCables);
    }
}
