/**
 * The engine's build phases, from docs/PLAN.md. Update `status` as phases ship; the landing
 * page draws shipped phases solid and the rest as outlines.
 */
export type PhaseStatus = "shipped" | "now" | "next" | "planned" | "later";

export interface Phase {
    readonly number: number;
    readonly title: string;
    readonly adds: string;
    readonly status: PhaseStatus;
    /** Demos that show it, by id in the demo app (shipped) or by name (planned). */
    readonly demos: readonly { readonly label: string; readonly id?: string }[];
}

export const PHASES: readonly Phase[] = [
    {
        number: 0,
        title: "The loop",
        adds: "A fixed timestep with interpolated rendering",
        status: "shipped",
        demos: [{ label: "Every demo's Smooth switch", id: "cloth" }],
    },
    {
        number: 1,
        title: "Math",
        adds: "Vectors, 3×3 and 3×4 matrices, quaternions",
        status: "shipped",
        demos: [{ label: "Rotation", id: "rotation" }],
    },
    {
        number: 2,
        title: "Particles",
        adds: "Point masses, damping, a particle world",
        status: "shipped",
        demos: [
            { label: "Ballistics", id: "ballistics" },
            { label: "Fireworks", id: "fireworks" },
        ],
    },
    {
        number: 3,
        title: "Forces and springs",
        adds: "Drag, springs, bungees, buoyancy, attraction, custom generators",
        status: "now",
        demos: [
            { label: "Cloth", id: "cloth" },
            { label: "Drumhead", id: "drumhead" },
            { label: "Elastic pendulum", id: "elastic-pendulum" },
            { label: "Raft", id: "raft" },
            { label: "Density column", id: "density-column" },
            { label: "Orbits", id: "orbits" },
        ],
    },
    {
        number: 4,
        title: "Rigid bodies",
        adds: "Orientation, inertia tensors, torque",
        status: "next",
        demos: [{ label: "Spinning bodies" }],
    },
    {
        number: 5,
        title: "Collision detection",
        adds: "Broadphase tree, SAT, GJK and EPA, contact manifolds",
        status: "planned",
        demos: [{ label: "Collision inspector" }],
    },
    {
        number: 6,
        title: "Contacts and friction",
        adds: "Sequential impulses, friction, stable stacking",
        status: "planned",
        demos: [{ label: "Stacking" }, { label: "Dominoes" }],
    },
    {
        number: 7,
        title: "Joints and sleep",
        adds: "Hinges, sliders, ragdolls, islands, sleeping",
        status: "planned",
        demos: [{ label: "Ragdoll" }, { label: "Chain bridge" }, { label: "Car" }],
    },
    {
        number: 8,
        title: "Beyond",
        adds: "Continuous collision, a Web Worker engine, determinism",
        status: "later",
        demos: [],
    },
];
