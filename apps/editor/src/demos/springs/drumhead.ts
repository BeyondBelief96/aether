import {
    BufferAttribute,
    Color,
    CylinderGeometry,
    DoubleSide,
    Mesh,
    MeshStandardMaterial,
    RingGeometry,
    TorusGeometry,
} from "three";
import { defineDemo } from "../../core/demo";
import { formatNumber } from "../../core/format";
import { number } from "../../core/params";
import { Substeps } from "../helpers/substeps";
import { TapHandle } from "../helpers/tap-handle";
import { DrumheadSim } from "./drumhead-sim";

/**
 * A drum skin of particles and `ParticleSpring`s, stretched over a rim (see `DrumheadSim`). The
 * drawn skin is a smooth disc whose heights are sampled from the particle grid, coloured by how
 * far each point is above or below rest. Tap the skin to strike it.
 */

const RADIUS = 5; // m
const SPACING = 0.25; // m
const HEIGHT = 2.4; // m, height of the skin
const SHELL_DEPTH = 0.9; // m
const MASS = 0.02; // kg per particle
const STIFFNESS = 20; // N/m
const MAX_SUBSTEP = 1 / 60; // s; the stiffest wave the grid carries is stable below this
const STRIKE_SPEED = 4; // m/s, at the centre of the mallet
const COLOR_RANGE = 0.08; // m of displacement for full colour

const _low = new Color();
const _flat = new Color();
const _high = new Color();
const _mix = new Color();

const params = {
    tension: number({
        label: "Tension",
        min: 0.05,
        max: 0.4,
        step: 0.01,
        default: 0.2,
        digits: 2,
    }),
    mallet: number({ label: "Mallet", min: 0.3, max: 1.5, step: 0.05, default: 0.6, unit: " m" }),
    damping: number({ label: "Damping", min: 0.2, max: 1, step: 0.01, default: 0.85 }),
};

export const drumheadDemo = defineDemo({
    id: "drumhead",
    title: "Drumhead",
    category: "springs",
    summary: "A drum skin of 1,200 particles, held taut by the springs between them.",
    hint: "Strike near the rim, then in the middle. They ring differently.",
    params,
    presets: [
        { label: "Tight", note: "Fast waves", values: { tension: 0.35, damping: 0.85 } },
        { label: "Loose", note: "Slow waves", values: { tension: 0.08, damping: 0.85 } },
        { label: "Big mallet", note: "1.4 m", values: { mallet: 1.4 } },
        { label: "Muffled", note: "Dies fast", values: { damping: 0.35 } },
    ],
    actions: [
        { id: "centre", label: "Strike centre", key: "c" },
        { id: "edge", label: "Strike edge", key: "x" },
    ],
    charts: [
        {
            id: "centre",
            title: "Height of the centre",
            series: [{ label: "Centre", color: 0 }],
            ranges: [
                { label: "±0.5 m", min: -0.5, max: 0.5, digits: 2 },
                { label: "±0.1 m", min: -0.1, max: 0.1, digits: 2 },
            ],
            reference: 0,
            seconds: 15,
            description: "How far the centre of the skin is above or below rest, over 15 seconds.",
        },
    ],
    camera: { position: { x: 0, y: 13, z: 11 }, target: { x: 0, y: 1.2, z: 0.4 } },
    source: "apps/editor/src/demos/springs/drumhead.ts",
    create({ root, view, palette, values, useWorld }) {
        let current = values;
        const substeps = new Substeps(MAX_SUBSTEP);
        const sim = new DrumheadSim({
            radius: RADIUS,
            spacing: SPACING,
            height: HEIGHT,
            mass: MASS,
            stiffness: STIFFNESS,
            tension: values.tension,
            damping: values.damping,
        });
        useWorld(sim.world);
        const { grid, side, cells } = sim;

        // Heights above rest, per grid point, from the last two steps. Outside the rim stays 0.
        const before = new Float32Array(side * side);
        const after = new Float32Array(side * side);
        const heights = new Float32Array(side * side);
        const capture = (into: Float32Array): void => {
            grid.forEach((p, n) => {
                if (p) into[n] = sim.displacement(p);
            });
        };
        const sample = (x: number, z: number): number => {
            const gx = x / SPACING + cells;
            const gz = z / SPACING + cells;
            const i = Math.min(Math.max(Math.floor(gx), 0), side - 2);
            const j = Math.min(Math.max(Math.floor(gz), 0), side - 2);
            const fx = gx - i;
            const fz = gz - j;
            const at = (a: number, b: number) => heights[a * side + b]!;
            return (
                (at(i, j) * (1 - fz) + at(i, j + 1) * fz) * (1 - fx) +
                (at(i + 1, j) * (1 - fz) + at(i + 1, j + 1) * fz) * fx
            );
        };

        // The drawn skin: a flat ring mesh laid on its back, rings from the centre out.
        const geometry = new RingGeometry(0.001, RADIUS, 128, 40).rotateX(-Math.PI / 2);
        geometry.translate(0, HEIGHT, 0);
        const positions = geometry.getAttribute("position") as BufferAttribute;
        const colors = new BufferAttribute(new Float32Array(positions.count * 3), 3);
        geometry.setAttribute("color", colors);
        const skin = new Mesh(
            geometry,
            new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.75 }),
        );
        skin.castShadow = true;
        skin.frustumCulled = false;
        // Fixed bounds for picking, roomy enough for any wave.
        geometry.computeBoundingSphere();
        geometry.boundingSphere!.radius += 1;
        _low.setHex(palette.series[1]);
        _flat.setHex(palette.gridMajor);
        _high.setHex(palette.accent);

        const hoop = new Mesh(
            new TorusGeometry(RADIUS, 0.08, 12, 128),
            new MeshStandardMaterial({ color: palette.ink }),
        );
        hoop.rotation.x = Math.PI / 2;
        hoop.position.y = HEIGHT;
        const shell = new Mesh(
            new CylinderGeometry(RADIUS, RADIUS, SHELL_DEPTH, 128, 1, true),
            new MeshStandardMaterial({ color: palette.ink, side: DoubleSide, roughness: 0.6 }),
        );
        shell.position.y = HEIGHT - SHELL_DEPTH / 2;
        shell.castShadow = true;
        root.add(skin, hoop, shell);

        const strike = (x: number, z: number): void =>
            sim.strike(x, z, current.mallet, STRIKE_SPEED);
        const tap = new TapHandle(view, skin, (hit) => strike(hit.point.x, hit.point.z));

        capture(after);
        strike(0, 0);

        return {
            update(next, changed) {
                current = next;
                if (changed.has("tension")) sim.setTension(next.tension);
                if (changed.has("damping")) sim.setDamping(next.damping);
            },
            action(id) {
                if (id === "centre") strike(0, 0);
                if (id === "edge") strike(RADIUS * 0.62, RADIUS * 0.2);
            },
            step(dt) {
                before.set(after);
                substeps.run(dt, (h) => sim.step(h));
                capture(after);
            },
            sample: () => ({ centre: [sim.displacement(sim.centre)] }),
            sync(alpha) {
                for (let n = 0; n < heights.length; n++) {
                    heights[n] = before[n]! + (after[n]! - before[n]!) * alpha;
                }
                for (let v = 0; v < positions.count; v++) {
                    const h = sample(positions.getX(v), positions.getZ(v));
                    positions.setY(v, HEIGHT + h);
                    const t = Math.max(-1, Math.min(1, h / COLOR_RANGE));
                    _mix.copy(_flat).lerp(t < 0 ? _low : _high, Math.abs(t));
                    colors.setXYZ(v, _mix.r, _mix.g, _mix.b);
                }
                positions.needsUpdate = true;
                colors.needsUpdate = true;
                geometry.computeVertexNormals();
            },
            readouts: () => [
                {
                    title: "Skin",
                    rows: [
                        {
                            label: "Particles",
                            value: formatNumber(sim.world.particles.length, 0),
                        },
                        { label: "Springs", value: formatNumber(sim.links.length, 0) },
                        { label: "Tension", value: `${formatNumber(sim.springTension(), 2)} N` },
                    ],
                },
                {
                    title: "Sound",
                    color: 0,
                    rows: [
                        { label: "Wave speed", value: `${formatNumber(sim.waveSpeed(), 2)} m/s` },
                        { label: "Lowest note", value: `${formatNumber(sim.lowestNote(), 2)} Hz` },
                        {
                            label: "Centre",
                            value: `${formatNumber(sim.displacement(sim.centre), 2)} m`,
                        },
                    ],
                },
            ],
            dispose() {
                tap.dispose();
            },
        };
    },
});
