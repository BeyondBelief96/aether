import type { Particle } from "../engine/index.js";
import { Vec3 } from "../math/index.js";
import type { ParticleForceGenerator } from "./particle-force-generator.js";

const _force = new Vec3();

/**
 * A Hooke's law spring from the particle it acts on to `other`, with force magnitude
 * `springConstant · |length - restLength|`.
 *
 * Only the particle it is registered on is pushed. To act on both ends, register one spring on
 * each end, each pointing at the other. Immovable particles and coincident ends are skipped.
 */
export class ParticleSpring implements ParticleForceGenerator {
    /** Particle at the far end of the spring. */
    readonly other: Particle;
    private readonly springConstant: number;
    private readonly restLength: number;

    /**
     * @param other Particle at the far end of the spring.
     * @param springConstant Stiffness in N/m.
     * @param restLength Length in metres at which the spring exerts no force.
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
        if (length === 0) return;
        particle.addForce(
            _force.scale((-this.springConstant * (length - this.restLength)) / length),
        );
    }
}
