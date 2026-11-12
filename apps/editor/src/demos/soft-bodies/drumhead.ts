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
import { Particle, ParticleSpring, ParticleWorld } from "aether-physics";
import { defineDemo } from "../../core/demo";
import { formatNumber } from "../../core/format";
import { number } from "../../core/params";
import { substepsFor } from "../helpers/substeps";
import { TapHandle } from "../helpers/tap-handle";

/**
 * A round skin of particles on a square grid, each joined to its four neighbours by a
 * `ParticleSpring` on each end. The springs' rest length is shorter than the grid spacing, so
 * the skin is stretched over the rim, and that tension is what carries a strike across it as a
 * wave. Particles on the rim are immovable. The drawn skin is a smooth disc whose heights are
 * sampled from the particle grid.
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
const SAMPLES_PER_SECOND = 30;
const BESSEL_ZERO = 2.405; // first zero of J0, which sets the skin's lowest note
const CELLS = Math.floor(RADIUS / SPACING); // grid points from the centre to the rim
const SIDE = 2 * CELLS + 1;

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
    category: "soft-bodies",
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
            capacity: SAMPLES_PER_SECOND * 15,
            description: "How far the centre of the skin is above or below rest, over 15 seconds.",
        },
    ],
    camera: { position: { x: 0, y: 13, z: 11 }, target: { x: 0, y: 1.2, z: 0.4 } },
    source: "apps/editor/src/demos/soft-bodies/drumhead.ts",
    create({ root, view, palette, values, plot, useWorld }) {
        let current = values;
        let sampleTime = 0;
        const world = useWorld(new ParticleWorld());
        world.gravity.set(0, 0, 0);

        // Grid points inside the rim, row-major. A point missing a neighbour is on the rim.
        const inside = (i: number, j: number) =>
            Math.abs(i) <= CELLS &&
            Math.abs(j) <= CELLS &&
            (i * i + j * j) * SPACING * SPACING <= RADIUS ** 2;
        const slot = (i: number, j: number) => (i + CELLS) * SIDE + (j + CELLS);
        const grid: (Particle | null)[] = new Array<Particle | null>(SIDE * SIDE).fill(null);
        for (let i = -CELLS; i <= CELLS; i++) {
            for (let j = -CELLS; j <= CELLS; j++) {
                if (!inside(i, j)) continue;
                const particle = new Particle();
                particle.position.set(i * SPACING, HEIGHT, j * SPACING);
                const rim =
                    !inside(i + 1, j) ||
                    !inside(i - 1, j) ||
                    !inside(i, j + 1) ||
                    !inside(i, j - 1);
                if (rim) particle.setMass(Infinity);
                else {
                    particle.setMass(MASS);
                    world.particles.push(particle);
                }
                grid[slot(i, j)] = particle;
            }
        }
        const centre = grid[slot(0, 0)]!;
        const links: [Particle, Particle][] = [];
        for (let i = -CELLS; i <= CELLS; i++) {
            for (let j = -CELLS; j <= CELLS; j++) {
                const a = grid[slot(i, j)];
                if (!a) continue;
                for (const b of [
                    inside(i + 1, j) && grid[slot(i + 1, j)],
                    inside(i, j + 1) && grid[slot(i, j + 1)],
                ]) {
                    if (b && (a.hasFiniteMass() || b.hasFiniteMass())) links.push([a, b]);
                }
            }
        }

        const rebuildForces = (): void => {
            world.forceRegistry.clear();
            const rest = SPACING * (1 - current.tension);
            for (const [a, b] of links) {
                if (a.hasFiniteMass())
                    world.forceRegistry.add(a, new ParticleSpring(b, STIFFNESS, rest));
                if (b.hasFiniteMass())
                    world.forceRegistry.add(b, new ParticleSpring(a, STIFFNESS, rest));
            }
        };
        const applyDamping = (): void => {
            for (const particle of world.particles) particle.damping = current.damping;
        };

        // Heights above rest, per grid point, from the last two steps. Outside the rim stays 0.
        const before = new Float32Array(SIDE * SIDE);
        const after = new Float32Array(SIDE * SIDE);
        const heights = new Float32Array(SIDE * SIDE);
        const capture = (into: Float32Array): void => {
            grid.forEach((p, n) => {
                if (p) into[n] = p.position.y - HEIGHT;
            });
        };
        const sample = (x: number, z: number): number => {
            const gx = x / SPACING + CELLS;
            const gz = z / SPACING + CELLS;
            const i = Math.min(Math.max(Math.floor(gx), 0), SIDE - 2);
            const j = Math.min(Math.max(Math.floor(gz), 0), SIDE - 2);
            const fx = gx - i;
            const fz = gz - j;
            const at = (a: number, b: number) => heights[a * SIDE + b]!;
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

        const strike = (x: number, z: number): void => {
            const reach = current.mallet;
            for (const particle of world.particles) {
                const d = Math.hypot(particle.position.x - x, particle.position.z - z);
                if (d >= reach) continue;
                const falloff = Math.cos((Math.PI * d) / (2 * reach)) ** 2;
                particle.velocity.y -= STRIKE_SPEED * falloff;
            }
        };

        const tap = new TapHandle(view, skin, (hit) => strike(hit.point.x, hit.point.z));

        /** Force each spring pulls with at rest, N. */
        const tension = () => STIFFNESS * SPACING * current.tension;
        // Wave speed: √(pull per unit length of skin / mass per unit area).
        const waveSpeed = () => Math.sqrt(tension() / SPACING / (MASS / SPACING ** 2));

        rebuildForces();
        applyDamping();
        capture(after);
        strike(0, 0);

        return {
            update(next, changed) {
                current = next;
                if (changed.has("tension")) rebuildForces();
                if (changed.has("damping")) applyDamping();
            },
            action(id) {
                if (id === "centre") strike(0, 0);
                if (id === "edge") strike(RADIUS * 0.62, RADIUS * 0.2);
            },
            step(dt) {
                before.set(after);
                const n = substepsFor(dt, MAX_SUBSTEP);
                for (let i = 0; i < n; i++) world.step(dt / n);
                capture(after);
                sampleTime += dt;
                while (sampleTime >= 1 / SAMPLES_PER_SECOND) {
                    plot("centre", [centre.position.y - HEIGHT]);
                    sampleTime -= 1 / SAMPLES_PER_SECOND;
                }
            },
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
            readouts() {
                const speed = waveSpeed();
                return [
                    {
                        title: "Skin",
                        rows: [
                            { label: "Particles", value: formatNumber(world.particles.length, 0) },
                            { label: "Springs", value: formatNumber(links.length, 0) },
                            { label: "Tension", value: `${formatNumber(tension(), 2)} N` },
                        ],
                    },
                    {
                        title: "Sound",
                        color: 0,
                        rows: [
                            { label: "Wave speed", value: `${formatNumber(speed, 2)} m/s` },
                            {
                                label: "Lowest note",
                                value: `${formatNumber((BESSEL_ZERO * speed) / (2 * Math.PI * RADIUS), 2)} Hz`,
                            },
                            {
                                label: "Centre",
                                value: `${formatNumber(centre.position.y - HEIGHT, 2)} m`,
                            },
                        ],
                    },
                ];
            },
            dispose() {
                tap.dispose();
            },
        };
    },
});
