import type { Particle } from "../engine/index.js";
import { Vec3 } from "../math/index.js";
import type { ParticleForce } from "./particle-force.js";

const _force = new Vec3();

/**
 * A Hooke's law spring joining two particles, with force magnitude
 * `springConstant · |length - restLength|`.
 *
 * The force is computed once per step and applied equal and opposite to both ends. Immovable
 * ends receive no force, and coincident ends are skipped.
 */
export class ParticleSpring implements ParticleForce {
    readonly a: Particle;
    readonly b: Particle;
    readonly particles: readonly Particle[];
    private readonly springConstant: number;
    private readonly restLength: number;

    /**
     * @param a First end.
     * @param b Second end.
     * @param springConstant Stiffness in N/m.
     * @param restLength Length in metres at which the spring exerts no force.
     * @throws RangeError If either value is negative, or if `a` and `b` are the same particle.
     */
    constructor(a: Particle, b: Particle, springConstant: number, restLength: number) {
        if (a === b) throw new RangeError("a spring cannot join a particle to itself");
        if (!(springConstant >= 0)) {
            throw new RangeError(`springConstant must be non-negative, got ${springConstant}`);
        }
        if (!(restLength >= 0)) {
            throw new RangeError(`restLength must be non-negative, got ${restLength}`);
        }
        this.a = a;
        this.b = b;
        this.particles = [a, b];
        this.springConstant = springConstant;
        this.restLength = restLength;
    }

    apply(_dt: number): void {
        const aMoves = this.a.hasFiniteMass();
        const bMoves = this.b.hasFiniteMass();
        if (!aMoves && !bMoves) return;

        _force.copy(this.a.position).subtract(this.b.position);
        const length = _force.magnitude();
        if (length === 0) return;

        _force.scale((-this.springConstant * (length - this.restLength)) / length);
        if (aMoves) this.a.addForce(_force);
        if (bMoves) this.b.addForce(_force.negate());
    }
}
