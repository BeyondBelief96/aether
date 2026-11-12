import {
    Particle,
    ParticleAnchoredSpring,
    ParticleAttraction,
    ParticleWorld,
    Vec3,
    type ParticleIntegrator,
    type Vec3Like,
} from "aether-physics";

/** The two scenes the shoot-out runs: a mass on a spring, or a planet around a fixed star. */
export type ShootoutScene = "spring" | "orbit";

export interface ShootoutOptions {
    readonly scene: ShootoutScene;
    /** Spring stiffness in N/m, for a 1 kg mass. */
    readonly stiffness: number;
    /** Orbital eccentricity, in [0, 1). */
    readonly eccentricity: number;
}

/** Long enough that a lane can reach `DIVERGED_RATIO` × its energy without passing its anchor. */
export const SPRING_REST = 4; // m
export const SPRING_STRETCH = 1.5; // m, initial stretch past the rest length
export const ORBIT_SEMI_MAJOR = 3; // m
export const ORBIT_PERIOD = 4; // s, for every eccentricity
/** G·M of the star, chosen so the orbit takes `ORBIT_PERIOD`: μ = (2π/T)²·a³. */
export const ORBIT_MU = ((2 * Math.PI) / ORBIT_PERIOD) ** 2 * ORBIT_SEMI_MAJOR ** 3;
/**
 * A lane stops once its energy leaves `(0, DIVERGED_RATIO)` times its starting energy. On the
 * orbit, a ratio at or below 0 means the planet is no longer bound.
 */
export const DIVERGED_RATIO = 3;
const TIMING_SMOOTHING = 0.05;

/**
 * One integrator's copy of the scene: its own world with one moving particle. The scene's
 * fixed point (the spring's anchor or the star) is `pivot`, in world space.
 */
export class IntegratorLane {
    readonly integrator: ParticleIntegrator;
    readonly world = new ParticleWorld();
    readonly body = new Particle();
    readonly pivot = new Vec3();
    readonly initialEnergy: number;
    /** Set once the energy runs away; the lane then stops stepping. */
    diverged = false;
    /** Smoothed wall-clock time of one `world.step`, in microseconds. */
    stepMicros = 0;

    private readonly stiffness: number;
    private readonly scene: ShootoutScene;
    private readonly savedPosition = new Vec3();
    private readonly savedVelocity = new Vec3();

    constructor(integrator: ParticleIntegrator, origin: Vec3Like, options: ShootoutOptions) {
        this.integrator = integrator;
        this.scene = options.scene;
        this.stiffness = options.stiffness;
        this.world.gravity.set(0, 0, 0);
        this.world.integrator = integrator;
        this.body.damping = 1;
        this.world.particles.push(this.body);

        if (options.scene === "spring") {
            // The mass swings symmetrically about the lane's centre.
            this.pivot.copy(origin).add({ x: -SPRING_REST, y: 0, z: 0 });
            this.body.position
                .copy(this.pivot)
                .add({ x: SPRING_REST + SPRING_STRETCH, y: 0, z: 0 });
            const spring = new ParticleAnchoredSpring(this.pivot, options.stiffness, SPRING_REST);
            this.world.forceRegistry.add(this.body, spring);
        } else {
            // The orbit lies in the XY plane, facing the camera. The star sits at a focus, offset
            // so the ellipse is centred on the lane.
            const e = options.eccentricity;
            const periapsis = ORBIT_SEMI_MAJOR * (1 - e);
            const speed = Math.sqrt((ORBIT_MU * (1 + e)) / periapsis);
            this.pivot.copy(origin).add({ x: ORBIT_SEMI_MAJOR * e, y: 0, z: 0 });
            this.body.position.copy(this.pivot).add({ x: periapsis, y: 0, z: 0 });
            this.body.velocity.set(0, speed, 0);
            const star = new Particle();
            star.position.copy(this.pivot);
            this.world.forceRegistry.add(this.body, new ParticleAttraction(star, ORBIT_MU, 0));
        }
        this.initialEnergy = this.energy();
    }

    /** Total mechanical energy of the 1 kg body, in joules. */
    energy(): number {
        const kinetic = 0.5 * this.body.velocity.magnitudeSquared();
        const distance = this.body.position.distanceTo(this.pivot);
        if (this.scene === "spring") {
            return kinetic + 0.5 * this.stiffness * (distance - SPRING_REST) ** 2;
        }
        return kinetic - ORBIT_MU / distance;
    }

    /** Energy as a fraction of the starting energy. 1 means none gained or lost. */
    relativeEnergy(): number {
        return this.energy() / this.initialEnergy;
    }

    /** Advances the lane by `dt`, unless it has diverged. A diverging step is undone. */
    step(dt: number): void {
        if (this.diverged) return;
        this.savedPosition.copy(this.body.position);
        this.savedVelocity.copy(this.body.velocity);

        const start = performance.now();
        this.world.step(dt);
        const micros = (performance.now() - start) * 1000;
        this.stepMicros += (micros - this.stepMicros) * TIMING_SMOOTHING;

        const ratio = this.relativeEnergy();
        if (!(ratio > 0 && ratio < DIVERGED_RATIO)) {
            this.body.position.copy(this.savedPosition);
            this.body.velocity.copy(this.savedVelocity);
            this.diverged = true;
        }
    }
}
