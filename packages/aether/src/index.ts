export { FixedStepLoop } from "./loop/index.js";
export type { FrameResult } from "./loop/index.js";

export {
    GroundContacts,
    Particle,
    ParticleAnchoredSpring,
    ParticleAttraction,
    ParticleBungee,
    ParticleBuoyancy,
    ParticleContact,
    ParticleContactResolver,
    ParticleDrag,
    ParticleForceRegistry,
    ParticleGravity,
    ParticleSpring,
    ParticleWorld,
    ExplicitEuler,
    Rk4,
    SemiImplicitEuler,
    VelocityVerlet,
} from "./particles/index.js";
export type {
    ForceEvaluator,
    ParticleContactGenerator,
    ParticleForceGenerator,
    ParticleIntegrator,
    ParticleWorldOptions,
} from "./particles/index.js";

export { EPSILON, approxEqual, clamp, Vec3, Mat3x3, Mat3x4, Quaternion } from "./math/index.js";
export type { QuatLike, Vec3Like } from "./math/index.js";
