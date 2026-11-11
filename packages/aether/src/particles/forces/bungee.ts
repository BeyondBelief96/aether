import type { Particle } from "../particle.js";
import { Vec3 } from "../../math/index.js";
import type { ParticleForceGenerator } from "./force-generator.js";

const _force = new Vec3();

/**
 * A spring from the particle it acts on to `other` that only pulls, with force magnitude
 * `springConstant · (length - restLength)` once stretched past `restLength`.
 *
 * Only the particle it is registered on is pulled. To act on both ends, register one bungee on
 * each end, each pointing at the other. Immovable particles are skipped.
 */
export class ParticleBungee implements ParticleForceGenerator {
    /** Particle at the far end of the bungee. */
    readonly other: Particle;
    private readonly springConstant: number;
    private readonly restLength: number;

    /**
     * @param other Particle at the far end of the bungee.
     * @param springConstant Stiffness in N/m.
     * @param restLength Length in metres below which the bungee exerts no force.
     * @throws RangeError If either value is negative.
     */
    constructor(other: Particle, springConstant: number, restLength: number) {
        if (!(springConstant >= 0)) {
            throw new RangeError(`springConstant must be non-negative, got ${springConstant}`);
        }
        if (!(restLength >= 0)) {
            throw new RangeError(`restLength must be non-negative, got ${restLength}`);
        }
        this.other = other;
        this.springConstant = springConstant;
        this.restLength = restLength;
    }

    updateForce(particle: Particle, _dt: number): void {
        if (!particle.hasFiniteMass()) return;
        _force.copy(particle.position).subtract(this.other.position);
        const length = _force.magnitude();
        if (length <= this.restLength) return;
        particle.addForce(
            _force.scale((-this.springConstant * (length - this.restLength)) / length),
        );
    }
}
