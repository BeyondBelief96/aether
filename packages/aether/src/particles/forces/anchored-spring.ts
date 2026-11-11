import type { Particle } from "../particle.js";
import { Vec3, type Vec3Like } from "../../math/index.js";
import type { ParticleForceGenerator } from "./force-generator.js";

const _force = new Vec3();

/**
 * A Hooke's law spring from the particle it acts on to a fixed point in world space, with force
 * magnitude `springConstant · |length - restLength|`.
 *
 * `anchor` is copied at construction and may be moved afterwards. Immovable particles and a
 * particle at the anchor are skipped.
 */
export class ParticleAnchoredSpring implements ParticleForceGenerator {
    /** World-space point at the far end of the spring. */
    readonly anchor: Vec3;
    private readonly springConstant: number;
    private readonly restLength: number;

    /**
     * @param anchor World-space point at the far end of the spring.
     * @param springConstant Stiffness in N/m.
     * @param restLength Length in metres at which the spring exerts no force.
     * @throws RangeError If either value is negative.
     */
    constructor(anchor: Vec3Like, springConstant: number, restLength: number) {
        if (!(springConstant >= 0)) {
            throw new RangeError(`springConstant must be non-negative, got ${springConstant}`);
        }
        if (!(restLength >= 0)) {
            throw new RangeError(`restLength must be non-negative, got ${restLength}`);
        }
        this.anchor = new Vec3().copy(anchor);
        this.springConstant = springConstant;
        this.restLength = restLength;
    }

    updateForce(particle: Particle, _dt: number): void {
        if (!particle.hasFiniteMass()) return;
        _force.copy(particle.position).subtract(this.anchor);
        const length = _force.magnitude();
        if (length === 0) return;
        particle.addForce(
            _force.scale((-this.springConstant * (length - this.restLength)) / length),
        );
    }
}
