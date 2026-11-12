import { BoxGeometry, CylinderGeometry, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { Vec3 } from "aether-physics";
import { defineDemo } from "../../core/demo";
import { formatNumber } from "../../core/format";
import { choice, number, toggle } from "../../core/params";
import { kineticEnergy, worstRodError } from "../helpers/measure";
import { ResolverBudget, resolverParams } from "../helpers/resolver";
import { StepBlend } from "../helpers/step-blend";
import { Strut } from "../helpers/strut";
import { substepsFor } from "../helpers/substeps";
import { FrameSim, type FrameShape } from "./frame-sim";

/**
 * A frame of particles and `ParticleRod`s dropped onto `GroundContacts`. Rods alone make it a
 * rigid body: it lands on a corner, tumbles and settles on a face, and each rod stays within a
 * millimetre of its length once it has landed. A rigid frame of `n` corners needs `3n − 6` rods;
 * without the bracing rods the prism and the cube have too few and fold flat when they land.
 */

const SIZE = 1; // m, edge length
const CORNER_MASS = 1; // kg
const CORNER_RADIUS = 0.08; // m
const ROD_RADIUS = 0.035; // m
const MAX_SUBSTEP = 1 / 120; // s
const ERROR_WARNING = 0.01; // m
const PAD = 4; // m, width of the slab the frame lands on

const _a = new Vec3();
const _b = new Vec3();

const params = {
    shape: choice<FrameShape>({
        label: "Shape",
        options: [
            { value: "tetrahedron", label: "Tetrahedron" },
            { value: "prism", label: "Prism" },
            { value: "cube", label: "Cube" },
        ],
        default: "cube",
    }),
    braced: toggle({
        label: "Bracing rods",
        default: true,
        hidden: (values) => values.shape === "tetrahedron",
    }),
    height: number({ label: "Drop height", min: 1, max: 6, step: 0.1, default: 3, unit: " m" }),
    spin: number({ label: "Spin", min: 0, max: 6, step: 0.1, default: 2, unit: " rad/s" }),
    restitution: number({
        label: "Ground restitution",
        min: 0,
        max: 0.8,
        step: 0.01,
        default: 0.3,
    }),
    ...resolverParams({ auto: true, min: 1, max: 200, step: 1, default: 40 }),
};

export const frameDemo = defineDemo({
    id: "frames",
    title: "Frames",
    category: "contacts",
    summary: "Shapes built only from rods, dropped spinning onto the ground.",
    hint: "Turn off Bracing rods on the cube. Twelve edges can't hold a cube's shape, and it folds flat.",
    params,
    presets: [
        { label: "Cube", note: "18 rods", values: { shape: "cube", braced: true, auto: true } },
        {
            label: "Unbraced",
            note: "12 rods",
            values: { shape: "cube", braced: false, auto: true },
        },
        {
            label: "Tetrahedron",
            note: "6 rods",
            values: { shape: "tetrahedron", spin: 4, auto: true },
        },
        {
            label: "Starved",
            note: "4 iterations",
            values: { shape: "cube", braced: true, auto: false, iterations: 4 },
        },
    ],
    actions: [{ id: "drop", label: "Drop", key: "d" }],
    camera: { position: { x: 3.2, y: 2.4, z: 4.2 }, target: { x: 0, y: 0.8, z: 0 } },
    source: "apps/editor/src/demos/contacts/frame.ts",
    create({ root, palette, values, useWorld }) {
        let current = values;
        let dt = 1 / 60;
        const sim = new FrameSim({
            shape: values.shape,
            braced: values.braced,
            size: SIZE,
            cornerMass: CORNER_MASS,
            cornerRadius: CORNER_RADIUS,
            restitution: values.restitution,
        });
        const budget = new ResolverBudget(sim.world, values);
        useWorld(sim.world);
        const blend = new StepBlend();

        const pad = new Mesh(
            new BoxGeometry(PAD, 0.04, PAD),
            new MeshStandardMaterial({ color: palette.muted }),
        );
        pad.position.y = -0.02;
        root.add(pad);

        const cornerGeometry = new SphereGeometry(CORNER_RADIUS, 20, 12);
        const rodGeometry = new CylinderGeometry(ROD_RADIUS, ROD_RADIUS, 1, 10);
        const cornerMaterial = new MeshStandardMaterial({ color: palette.ink });
        const edgeMaterial = new MeshStandardMaterial({ color: palette.ink, roughness: 0.6 });
        const braceMaterial = new MeshStandardMaterial({ color: palette.accent, roughness: 0.6 });
        let corners: Mesh[] = [];
        let rods: Strut[] = [];

        const drop = (): void => {
            sim.drop(current.height, current.spin);
            blend.reset(sim.particles);
        };

        /** Matches the meshes to the frame's corners and rods. */
        const buildMeshes = (): void => {
            for (const m of [...corners, ...rods]) root.remove(m);
            corners = sim.particles.map(() => {
                const corner = new Mesh(cornerGeometry, cornerMaterial);
                corner.castShadow = true;
                return corner;
            });
            rods = sim.rods.map(
                (_, i) => new Strut(rodGeometry, i < sim.edgeCount ? edgeMaterial : braceMaterial),
            );
            root.add(...corners, ...rods);
        };
        buildMeshes();
        drop();

        return {
            update(next, changed) {
                current = next;
                if (changed.has("restitution")) sim.ground.restitution = next.restitution;
                budget.update(next, changed);
                const reshaped = changed.has("shape") || changed.has("braced");
                if (reshaped) {
                    sim.setShape(next.shape, next.braced);
                    buildMeshes();
                }
                if (reshaped || changed.has("height") || changed.has("spin")) drop();
            },
            action(id) {
                if (id === "drop") drop();
            },
            step(stepDt) {
                dt = stepDt;
                blend.remember(sim.particles);
                const substeps = substepsFor(stepDt, MAX_SUBSTEP);
                for (let i = 0; i < substeps; i++) sim.step(stepDt / substeps);
            },
            sync(alpha) {
                blend.blend(alpha);
                sim.particles.forEach((p, i) => corners[i]!.position.copy(blend.positionOf(p)));
                sim.rods.forEach(({ particleA, particleB }, i) => {
                    rods[i]!.place(
                        blend.positionOf(particleA, _a),
                        blend.positionOf(particleB, _b),
                    );
                });
            },
            readouts: () => {
                const error = worstRodError(sim.rods);
                return [
                    {
                        title: "Frame",
                        color: 0,
                        rows: [
                            { label: "Corners", value: String(sim.particles.length) },
                            {
                                label: "Rods",
                                value: `${sim.rods.length} of ${sim.rodsNeeded} needed`,
                                warn: sim.rods.length < sim.rodsNeeded,
                            },
                            {
                                label: "Centre height",
                                value: `${formatNumber(sim.centreHeight(), 2)} m`,
                            },
                            {
                                label: "Kinetic energy",
                                value: `${formatNumber(kineticEnergy(sim.particles), 2)} J`,
                            },
                        ],
                    },
                    {
                        title: "Resolver",
                        color: 1,
                        rows: [
                            { label: "Contacts", value: String(sim.world.contactCount) },
                            budget.readout(),
                            {
                                label: "Worst rod error",
                                value: `${formatNumber(error * 1000, 1)} mm`,
                                warn: error > ERROR_WARNING,
                            },
                            {
                                label: "Substeps per step",
                                value: String(substepsFor(dt, MAX_SUBSTEP)),
                            },
                        ],
                    },
                ];
            },
        };
    },
});
