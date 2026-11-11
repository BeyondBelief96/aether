import { BoxGeometry, LineBasicMaterial, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { clamp } from "aether-physics";
import { defineDemo, type SeriesIndex } from "../../core/demo";
import { formatCompact, formatNumber } from "../../core/format";
import { choice, number } from "../../core/params";
import {
    explicitEuler,
    rk4,
    semiImplicitEuler,
    velocityVerlet,
    type AccelFn,
    type Integrator,
    type OscillatorState,
} from "../helpers/integrators";
import { Polyline } from "../helpers/polyline";
import { VectorArrow } from "../helpers/vector-arrow";

/**
 * The same mass on the same spring, stepped by four integrators from the same start. The
 * translucent ball on each row is the exact solution `A·cos(ωt)`, shown while damping is off.
 * The chart plots each row's energy over its starting energy.
 */

const ENTRIES: readonly { id: string; label: string; integrator: Integrator }[] = [
    { id: "explicit", label: "Explicit Euler", integrator: explicitEuler },
    { id: "semi", label: "Semi-implicit Euler", integrator: semiImplicitEuler },
    { id: "verlet", label: "Velocity Verlet", integrator: velocityVerlet },
    { id: "rk4", label: "RK4", integrator: rk4 },
];

const MASS = 1; // kg
const AMPLITUDE = 1.5; // m
const HEIGHT = 1; // m
const ANCHOR_X = -5.5; // m
const ROW_SPACING = 2; // m
const MAX_DISPLAY_OFFSET = 4.5; // m
const BOB_RADIUS = 0.3; // m
const COIL_POINTS = 96;
const COIL_TURNS = 10;
const COIL_RADIUS = 0.16; // m
const VELOCITY_ARROW_SCALE = 0.3; // m of arrow per m/s
const MAX_ARROW_SPEED = 10; // m/s
const DIMMED_OPACITY = 0.15;
const GHOST_OPACITY = 0.25;
const GHOST_SCALE = 1.25;
const SAMPLES_PER_SECOND = 30;
const CHART_SECONDS = 20;
/** Energy ratios past this are flagged. */
const BLOWN_UP_RATIO = 10;

const _point = { x: 0, y: 0, z: 0 };

const params = {
    stiffness: number({ label: "Stiffness", min: 1, max: 100, step: 1, default: 10, unit: " N/m" }),
    damping: choice({
        label: "Damping",
        options: [
            { value: "none", label: "None" },
            { value: "power", label: "e^(−c·dt)" },
            { value: "pade", label: "1/(1+c·dt)" },
        ],
        default: "none",
    }),
    rate: number({
        label: "Damping rate",
        min: 0,
        max: 3,
        step: 0.05,
        default: 0.5,
        unit: " 1/s",
        hidden: (v) => v.damping === "none",
    }),
    focus: choice({
        label: "Highlight",
        options: [
            { value: "all", label: "All" },
            ...ENTRIES.map(({ id }, i) => ({
                value: id,
                label: ["Euler", "Semi", "Verlet", "RK4"][i]!,
            })),
        ],
        default: "all",
    }),
};

function dampingFactor(mode: string, rate: number, dt: number): number {
    if (mode === "power") return Math.exp(-rate * dt);
    if (mode === "pade") return 1 / (1 + rate * dt);
    return 1;
}

export const integratorsDemo = defineDemo({
    id: "integrators",
    title: "Integrator shoot-out",
    category: "foundations",
    summary:
        "One spring, four integrators. Explicit Euler gains energy, semi-implicit Euler and " +
        "Verlet stay bounded, and RK4 slowly loses it.",
    hint: "Choose Coarse steps and watch explicit Euler's energy run away on the chart.",
    params,
    presets: [
        {
            label: "Gentle",
            note: "10 N/m, 60 Hz",
            values: { stiffness: 10, damping: "none" },
            hz: 60,
        },
        { label: "Stiff", note: "100 N/m", values: { stiffness: 100, damping: "none" }, hz: 60 },
        {
            label: "Coarse steps",
            note: "40 N/m, 15 Hz",
            values: { stiffness: 40, damping: "none" },
            hz: 15,
        },
        { label: "Damped", note: "e^(−c·dt)", values: { damping: "power", rate: 0.5 }, hz: 60 },
    ],
    charts: [
        {
            id: "energy",
            title: "Energy ÷ starting energy",
            series: ENTRIES.map(({ label }, i) => ({ label, color: i as SeriesIndex })),
            ranges: [
                { label: "0–3", min: 0, max: 3, digits: 1 },
                { label: "±10%", min: 0.9, max: 1.1, digits: 2 },
                { label: "±0.1%", min: 0.999, max: 1.001, digits: 3 },
            ],
            reference: 1,
            capacity: SAMPLES_PER_SECOND * CHART_SECONDS,
            description:
                "Energy of each integrator relative to its starting energy over the last 20 seconds.",
        },
    ],
    camera: { position: { x: -0.5, y: 10, z: 16 }, target: { x: -0.5, y: 0.5, z: 0 } },
    source: "apps/editor/src/demos/foundations/integrators.ts",
    create({ root, palette, values, plot, clearCharts }) {
        let current = values;
        let accel: AccelFn = () => 0;
        let time = 0;
        let previousTime = 0;
        let sampleTime = 0;
        let dt = 1 / 60;

        const rows = ENTRIES.map(({ integrator }, i) => {
            const color = palette.series[i]!;
            const z = (i - (ENTRIES.length - 1) / 2) * ROW_SPACING;
            const ball = new SphereGeometry(BOB_RADIUS, 24, 16);
            const bobMaterial = new MeshStandardMaterial({ color, transparent: true });
            const coilMaterial = new LineBasicMaterial({ color, transparent: true });
            const bob = new Mesh(ball, bobMaterial);
            const ghost = new Mesh(
                ball,
                new MeshStandardMaterial({ color, transparent: true, opacity: GHOST_OPACITY }),
            );
            const coil = new Polyline(COIL_POINTS, coilMaterial);
            coil.setCount(COIL_POINTS);
            const arrow = new VectorArrow(color);
            const anchor = new Mesh(
                new BoxGeometry(0.3, 1, 0.8),
                new MeshStandardMaterial({ color: palette.muted }),
            );
            anchor.position.set(ANCHOR_X, HEIGHT, z);
            bob.position.set(0, HEIGHT, z);
            ghost.position.set(0, HEIGHT, z);
            ghost.scale.setScalar(GHOST_SCALE);
            root.add(anchor, bob, ghost, coil, arrow);
            const state: OscillatorState = { x: AMPLITUDE, v: 0 };
            return {
                integrator,
                z,
                state,
                previousX: AMPLITUDE,
                bob,
                ghost,
                coil,
                arrow,
                bobMaterial,
                coilMaterial,
                label: { x: ANCHOR_X, y: HEIGHT + 0.8, z },
            };
        });

        const energyRatio = ({ x, v }: OscillatorState): number => {
            const initial = 0.5 * current.stiffness * AMPLITUDE * AMPLITUDE;
            return (0.5 * MASS * v * v + 0.5 * current.stiffness * x * x) / initial;
        };

        const restart = (): void => {
            for (const row of rows) {
                row.state.x = AMPLITUDE;
                row.state.v = 0;
                row.previousX = AMPLITUDE;
            }
            time = previousTime = sampleTime = 0;
            clearCharts();
        };

        const applyFocus = (): void => {
            rows.forEach((row, i) => {
                const lit = current.focus === "all" || current.focus === ENTRIES[i]!.id;
                row.bobMaterial.opacity = lit ? 1 : DIMMED_OPACITY;
                row.coilMaterial.opacity = lit ? 1 : DIMMED_OPACITY;
            });
        };

        const apply = (): void => {
            const omegaSquared = current.stiffness / MASS;
            accel = (x) => -omegaSquared * x;
            applyFocus();
        };
        apply();

        const drawCoil = (row: (typeof rows)[number], bobX: number): void => {
            const start = ANCHOR_X + 0.15;
            const end = bobX - BOB_RADIUS;
            for (let i = 0; i < COIL_POINTS; i++) {
                const t = i / (COIL_POINTS - 1);
                const angle = t * COIL_TURNS * 2 * Math.PI;
                const radius = COIL_RADIUS * Math.min(1, 12 * t, 12 * (1 - t));
                _point.x = start + (end - start) * t;
                _point.y = HEIGHT + radius * Math.cos(angle);
                _point.z = row.z + radius * Math.sin(angle);
                row.coil.setPoint(i, _point);
            }
        };

        return {
            update(next, changed) {
                current = next;
                apply();
                // Energy means something different at a new stiffness or damping model.
                if (changed.has("stiffness") || changed.has("damping")) restart();
            },
            step(stepDt) {
                dt = stepDt;
                const factor = dampingFactor(current.damping, current.rate, stepDt);
                for (const row of rows) {
                    row.previousX = row.state.x;
                    row.integrator(row.state, accel, stepDt);
                    row.state.v *= factor;
                }
                previousTime = time;
                time += stepDt;
                sampleTime += stepDt;
                if (sampleTime >= 1 / SAMPLES_PER_SECOND) {
                    const ratios = rows.map((row) => energyRatio(row.state));
                    while (sampleTime >= 1 / SAMPLES_PER_SECOND) {
                        plot("energy", ratios);
                        sampleTime -= 1 / SAMPLES_PER_SECOND;
                    }
                }
            },
            sync(alpha) {
                const omega = Math.sqrt(current.stiffness / MASS);
                const exactX =
                    AMPLITUDE * Math.cos(omega * (previousTime + (time - previousTime) * alpha));
                for (const row of rows) {
                    const blended = row.previousX + (row.state.x - row.previousX) * alpha;
                    const x = Number.isNaN(blended)
                        ? MAX_DISPLAY_OFFSET
                        : clamp(blended, -MAX_DISPLAY_OFFSET, MAX_DISPLAY_OFFSET);
                    row.bob.position.x = x;
                    drawCoil(row, x);
                    row.ghost.visible = current.damping === "none";
                    row.ghost.position.x = exactX;
                    const speed = clamp(row.state.v, -MAX_ARROW_SPEED, MAX_ARROW_SPEED);
                    row.arrow.update(
                        row.bob.position,
                        { x: speed, y: 0, z: 0 },
                        VELOCITY_ARROW_SCALE,
                    );
                }
            },
            readouts() {
                const omega = Math.sqrt(current.stiffness / MASS);
                return [
                    {
                        title: "Energy ratio",
                        rows: rows.map((row, i) => {
                            const ratio = energyRatio(row.state);
                            return {
                                label: ENTRIES[i]!.label,
                                value: formatCompact(ratio, 3),
                                warn: !(ratio < BLOWN_UP_RATIO),
                            };
                        }),
                    },
                    {
                        title: "Step",
                        rows: [
                            {
                                label: "ω·dt",
                                value: formatNumber(omega * dt, 3),
                                warn: omega * dt > 1,
                            },
                            {
                                label: "Velocity kept per second",
                                value: `${formatNumber(dampingFactor(current.damping, current.rate, dt) ** (1 / dt) * 100, 1)} %`,
                            },
                        ],
                    },
                ];
            },
            callouts: () =>
                rows.map((row, i) => ({
                    at: row.label,
                    text: `${ENTRIES[i]!.label} ${formatCompact(energyRatio(row.state), 2).trim()}×`,
                    color: i as SeriesIndex,
                })),
        };
    },
});
