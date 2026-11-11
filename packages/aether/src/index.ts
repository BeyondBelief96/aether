export { FixedStepLoop } from "./loop/index.js";
export type { FrameResult } from "./loop/index.js";

export {
    Particle,
    ParticleAnchoredSpring,
    ParticleAttraction,
    ParticleBungee,
    ParticleBuoyancy,
    ParticleDrag,
    ParticleForceRegistry,
    ParticleGravity,
    ParticleSpring,
    ParticleWorld,
} from "./particles/index.js";
export type { ParticleForceGenerator } from "./particles/index.js";

export { EPSILON, approxEqual, clamp, Vec3, Mat3x3, Mat3x4, Quaternion } from "./math/index.js";
export type { QuatLike, Vec3Like } from "./math/index.js";
