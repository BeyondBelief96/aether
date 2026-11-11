import type { Particle } from "../engine/index.js";
import { Vec3 } from "../math/index.js";
import type { ParticleForceGenerator } from "./particle-force-generator.js";

const _force = new Vec3();

/**
 * Pushes the particle up along +y with the weight of the liquid it displaces, for a liquid whose
 * flat surface lies at `y = waterHeight`.
 *
 * The particle is treated as spanning `maxDepth` above and below its position. Above
 * `waterHeight + maxDepth` no force is applied; below `waterHeight - maxDepth` it is fully
 * submerged and receives `liquidDensity · volume · gravity`; in between the force scales
 * linearly with the submerged fraction. Immovable particles are skipped.
 */
export class ParticleBuoyancy implements ParticleForceGenerator {
    private readonly maxDepth: number;
    private readonly volume: number;
    private readonly waterHeight: number;
    private readonly liquidDensity: number;
    private readonly gravity: number;

    /**
     * @param maxDepth Half the particle's vertical extent in metres.
     * @param volume Particle volume in m³.
     * @param waterHeight Height of the liquid surface on the y axis in metres.
     * @param liquidDensity Liquid density in kg/m³. Defaults to water.
     * @param gravity Magnitude of gravitational acceleration in m/s².
     * @throws RangeError If `maxDepth` is not positive, `waterHeight` is not finite, or any
     * other value is negative.
     */
    constructor(
        maxDepth: number,
        volume: number,
        waterHeight: number,
        liquidDensity = 1000,
        gravity = 9.81,
    ) {
        if (!(maxDepth > 0)) throw new RangeError(`maxDepth must be positive, got ${maxDepth}`);
        if (!(volume >= 0)) throw new RangeError(`volume must be non-negative, got ${volume}`);
        if (!Number.isFinite(waterHeight)) {
            throw new RangeError(`waterHeight must be finite, got ${waterHeight}`);
        }
        if (!(liquidDensity >= 0)) {
            throw new RangeError(`liquidDensity must be non-negative, got ${liquidDensity}`);
        }
        if (!(gravity >= 0)) throw new RangeError(`gravity must be non-negative, got ${gravity}`);
        this.maxDepth = maxDepth;
        this.volume = volume;
        this.waterHeight = waterHeight;
        this.liquidDensity = liquidDensity;
        this.gravity = gravity;
    }

    updateForce(particle: Particle, _dt: number): void {
        if (!particle.hasFiniteMass()) return;
        const y = particle.position.y;
        const top = this.waterHeight + this.maxDepth;
        if (y >= top) return;

        const fullForce = this.liquidDensity * this.volume * this.gravity;
        const submerged = Math.min((top - y) / (2 * this.maxDepth), 1);
        particle.addForce(_force.set(0, fullForce * submerged, 0));
    }
}
