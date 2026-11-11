import type { Particle } from "../particle.js";
import { Vec3, type Vec3Like } from "../../math/index.js";
import type { ParticleForceGenerator } from "./force-generator.js";

const _force = new Vec3();

/**
 * Adds `mass · scale · acceleration` to `particle`. Immovable particles and a zero scale are
 * skipped.
 *
 * @param particle Particle to act on.
 * @param acceleration Gravitational acceleration in m/s².
 * @param scale Multiplier on `acceleration`.
 */
export function addGravityForce(particle: Particle, acceleration: Vec3Like, scale: number): void {
    if (!particle.hasFiniteMass() || scale === 0) return;
    particle.addForce(_force.copy(acceleration).scale(particle.mass * scale));
}

/** Applies a constant gravitational acceleration as a force proportional to mass. Immovable particles are skipped. */
export class ParticleGravity implements ParticleForceGenerator {
    private readonly gravitationalAcceleration = new Vec3();

    /**
     * @param gravitationalAcceleration Acceleration in m/s², such as `(0, -9.81, 0)`. Copied.
     */
    constructor(gravitationalAcceleration: Vec3Like) {
        this.gravitationalAcceleration.copy(gravitationalAcceleration);
    }

    updateForce(particle: Particle, _dt: number): void {
        addGravityForce(particle, this.gravitationalAcceleration, 1);
    }
}
