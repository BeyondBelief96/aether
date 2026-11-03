import {
    BoxGeometry,
    Group,
    LineBasicMaterial,
    Mesh,
    MeshStandardMaterial,
    SphereGeometry,
    type Scene,
} from "three";
import {
    clamp,
    explicitEuler,
    rk4,
    semiImplicitEuler,
    velocityVerlet,
    type AccelFn,
    type Integrator,
    type OscillatorState,
} from "aether-physics";
import "../ui/panels/shootout-panel";
import type { DampingMode, EnergyRange } from "../ui/panels/shootout-panel";
import { SERIES_COLORS } from "./helpers/colors";
import { Polyline } from "./helpers/polyline";
import { disposeObject } from "./helpers/three";
import { VectorArrow } from "./helpers/vector-arrow";
import type { Demo, DemoInfo, DemoView } from "./types";

/**
 * Phase 2: the same mass on the same spring, stepped four ways.
 *
 * Each row runs one integrator from the same start. The translucent ball on each row is the
 * exact solution `A·cos(ωt)`, shown while damping is off. The graph plots each row's energy
 * over its starting energy: a flat line at 1 means the integrator neither adds nor removes
 * energy. Lower the physics rate or raise the stiffness to push `ω·dt` past each stability
 * limit.
 */

const ENTRIES: readonly { label: string; integrator: Integrator }[] = [
    { label: "Explicit", integrator: explicitEuler },
    { label: "Semi", integrator: semiImplicitEuler },
    { label: "Verlet", integrator: velocityVerlet },
    { label: "RK4", integrator: rk4 },
];

const MASS = 1; // kg
const DEFAULT_STIFFNESS = 10; // N/m
const DEFAULT_DAMPING_RATE = 0.5; // 1/s
const AMPLITUDE = 1.5; // m, starting displacement
const HEIGHT = 1; // m
const ANCHOR_X = -5.5; // m
const ROW_SPACING = 2; // m
const MAX_DISPLAY_OFFSET = 4.5; // m, how far a bob is drawn however large its state gets
const BOB_RADIUS = 0.3; // m
const COIL_POINTS = 96;
const COIL_TURNS = 10;
const COIL_RADIUS = 0.16; // m
const VELOCITY_ARROW_SCALE = 0.3; // m of arrow per m/s
const MAX_ARROW_SPEED = 10; // m/s, where the drawn arrow stops growing
const DIMMED_OPACITY = 0.15;
const GHOST_OPACITY = 0.25;
/** Larger than the bob, so the two don't z-fight when an integrator tracks the exact solution. */
const GHOST_SCALE = 1.25;
const SAMPLES_PER_SECOND = 30;
const CHART_SECONDS = 20;
const READOUT_INTERVAL_MS = 250;

// Scratch object, reused every update.
const _point = { x: 0, y: 0, z: 0 };

/** One oscillator: its integrator and state, and what draws it. */
class Row {
    readonly integrator: Integrator;
    readonly state: OscillatorState = { x: AMPLITUDE, v: 0 };
    readonly z: number;
    previousX = AMPLITUDE;
    readonly bobMaterial: MeshStandardMaterial;
    readonly coilMaterial: LineBasicMaterial;
    readonly bob: Mesh;
    readonly ghost: Mesh;
    readonly coil: Polyline;
    readonly arrow: VectorArrow;

    constructor(integrator: Integrator, color: number, z: number, group: Group) {
        this.integrator = integrator;
        this.z = z;
        const ball = new SphereGeometry(BOB_RADIUS, 24, 16);
        this.bobMaterial = new MeshStandardMaterial({ color, transparent: true });
        this.coilMaterial = new LineBasicMaterial({ color, transparent: true });
        this.bob = new Mesh(ball, this.bobMaterial);
        this.ghost = new Mesh(
            ball,
            new MeshStandardMaterial({ color, transparent: true, opacity: GHOST_OPACITY }),
        );
        this.coil = new Polyline(COIL_POINTS, this.coilMaterial);
        this.coil.setCount(COIL_POINTS);
        this.arrow = new VectorArrow(color);

        const anchor = new Mesh(
            new BoxGeometry(0.3, 1, 0.8),
            new MeshStandardMaterial({ color: 0x5d6673 }),
        );
        anchor.position.set(ANCHOR_X, HEIGHT, z);
        this.bob.position.set(0, HEIGHT, z);
        this.ghost.position.set(0, HEIGHT, z);
        this.ghost.scale.setScalar(GHOST_SCALE);
        group.add(anchor, this.bob, this.ghost, this.coil, this.arrow);
    }

    restart(): void {
        this.state.x = AMPLITUDE;
        this.state.v = 0;
        this.previousX = AMPLITUDE;
    }

    /** Draws a coil from the anchor to the bob at `bobX`. */
    drawCoil(bobX: number): void {
        const start = ANCHOR_X + 0.15;
        const end = bobX - BOB_RADIUS;
        for (let i = 0; i < COIL_POINTS; i++) {
            const t = i / (COIL_POINTS - 1);
            const angle = t * COIL_TURNS * 2 * Math.PI;
            // Pinched at both ends, so the coil meets the anchor and the bob at their centers.
            const radius = COIL_RADIUS * Math.min(1, 12 * t, 12 * (1 - t));
            _point.x = start + (end - start) * t;
            _point.y = HEIGHT + radius * Math.cos(angle);
            _point.z = this.z + radius * Math.sin(angle);
            this.coil.setPoint(i, _point);
        }
    }
}

/** Multiplier on velocity per step for the given damping model. */
function dampingFactor(mode: DampingMode, rate: number, dt: number): number {
    if (mode === "power") return Math.exp(-rate * dt);
    if (mode === "pade") return 1 / (1 + rate * dt);
    return 1;
}

class IntegratorShootoutDemo implements Demo {
    readonly panel = document.createElement("aether-shootout-panel");

    #group = new Group();
    #rows: Row[];
    #stiffness = DEFAULT_STIFFNESS;
    #accel: AccelFn = () => 0;
    #dampingMode: DampingMode = "none";
    #dampingRate = DEFAULT_DAMPING_RATE;
    #range: EnergyRange = "full";
    #focus: number | null = null;
    #time = 0;
    #previousTime = 0;
    #dt = 1 / 60;
    #sampleTime = 0;
    #lastReadoutMs = -Infinity;

    constructor() {
        this.#rows = ENTRIES.map(
            ({ integrator }, i) =>
                new Row(
                    integrator,
                    SERIES_COLORS[i] as number,
                    (i - (ENTRIES.length - 1) / 2) * ROW_SPACING,
                    this.#group,
                ),
        );
        this.#updateAccel();

        this.panel.chart.capacity = SAMPLES_PER_SECOND * CHART_SECONDS;
        this.panel.addEventListener("focus-change", (e) => {
            this.#focus = (e as CustomEvent<number | null>).detail;
            this.#pushInputs();
        });
        this.panel.addEventListener("range-change", (e) => {
            this.#range = (e as CustomEvent<EnergyRange>).detail;
            this.#pushInputs();
        });
        // Energy has a different meaning at a new stiffness, so the run starts over.
        this.panel.addEventListener("stiffness-change", (e) => {
            this.#stiffness = (e as CustomEvent<number>).detail;
            this.#updateAccel();
            this.#restart();
        });
        this.panel.addEventListener("damping-mode-change", (e) => {
            this.#dampingMode = (e as CustomEvent<DampingMode>).detail;
            this.#restart();
        });
        this.panel.addEventListener("damping-rate-change", (e) => {
            this.#dampingRate = (e as CustomEvent<number>).detail;
            this.#pushInputs();
        });
        this.panel.addEventListener("restart", () => this.#restart());
        this.#pushInputs();
        this.#pushReadouts();
    }

    #updateAccel(): void {
        const omegaSquared = this.#stiffness / MASS;
        this.#accel = (x) => -omegaSquared * x;
    }

    get #omega(): number {
        return Math.sqrt(this.#stiffness / MASS);
    }

    #restart(): void {
        for (const row of this.#rows) row.restart();
        this.#time = 0;
        this.#previousTime = 0;
        this.#sampleTime = 0;
        this.panel.chart.clear();
        this.#pushInputs();
        this.#pushReadouts();
    }

    /** Passes the input state back to the panel (its inputs are controlled). */
    #pushInputs(): void {
        this.panel.focused = this.#focus;
        this.panel.range = this.#range;
        this.panel.stiffness = this.#stiffness;
        this.panel.dampingMode = this.#dampingMode;
        this.panel.dampingRate = this.#dampingRate;
        this.#rows.forEach((row, i) => {
            const opacity = this.#focus === null || this.#focus === i ? 1 : DIMMED_OPACITY;
            row.bobMaterial.opacity = opacity;
            row.coilMaterial.opacity = opacity;
        });
    }

    #energyRatio({ x, v }: OscillatorState): number {
        const initial = 0.5 * this.#stiffness * AMPLITUDE * AMPLITUDE;
        return (0.5 * MASS * v * v + 0.5 * this.#stiffness * x * x) / initial;
    }

    #pushReadouts(): void {
        this.panel.rows = this.#rows.map((row, i) => ({
            label: ENTRIES[i]?.label ?? "",
            color: `--series-${i + 1}`,
            energyRatio: this.#energyRatio(row.state),
        }));
        this.panel.omegaDt = this.#omega * this.#dt;
        this.panel.keptPerSecond =
            dampingFactor(this.#dampingMode, this.#dampingRate, this.#dt) ** (1 / this.#dt);
    }

    mount(scene: Scene, view: DemoView): void {
        view.setCamera({ x: -0.5, y: 10, z: 16 }, { x: -0.5, y: 0.5, z: 0 });
        scene.add(this.#group);
    }

    step(dt: number): void {
        this.#dt = dt;
        const factor = dampingFactor(this.#dampingMode, this.#dampingRate, dt);
        for (const row of this.#rows) {
            row.previousX = row.state.x;
            row.integrator(row.state, this.#accel, dt);
            row.state.v *= factor;
        }
        this.#previousTime = this.#time;
        this.#time += dt;

        // Samples are evenly spaced in time, so the graph's width means the same at any rate.
        this.#sampleTime += dt;
        if (this.#sampleTime >= 1 / SAMPLES_PER_SECOND) {
            const ratios = this.#rows.map((row) => this.#energyRatio(row.state));
            while (this.#sampleTime >= 1 / SAMPLES_PER_SECOND) {
                this.panel.chart.push(ratios);
                this.#sampleTime -= 1 / SAMPLES_PER_SECOND;
            }
        }
    }

    sync(alpha: number): void {
        const showGhost = this.#dampingMode === "none";
        const time = this.#previousTime + (this.#time - this.#previousTime) * alpha;
        const exactX = AMPLITUDE * Math.cos(this.#omega * time);

        for (const row of this.#rows) {
            const blended = row.previousX + (row.state.x - row.previousX) * alpha;
            // A diverged state is drawn pinned at the end of its travel. NaN clamps to the limit.
            const x = Number.isNaN(blended)
                ? MAX_DISPLAY_OFFSET
                : clamp(blended, -MAX_DISPLAY_OFFSET, MAX_DISPLAY_OFFSET);
            row.bob.position.x = x;
            row.drawCoil(x);
            row.ghost.visible = showGhost;
            row.ghost.position.x = exactX;
            const speed = clamp(row.state.v, -MAX_ARROW_SPEED, MAX_ARROW_SPEED);
            row.arrow.update(row.bob.position, { x: speed, y: 0, z: 0 }, VELOCITY_ARROW_SCALE);
        }

        const now = performance.now();
        if (now - this.#lastReadoutMs < READOUT_INTERVAL_MS) return;
        this.#lastReadoutMs = now;
        this.#pushReadouts();
    }

    unmount(scene: Scene): void {
        scene.remove(this.#group);
        disposeObject(this.#group);
    }
}

export const integratorShootoutDemo: DemoInfo = {
    id: "integrator-shootout",
    title: "Integrator shoot-out",
    phase: 2,
    summary:
        "One spring, four integrators, and each one's energy over time. Explicit Euler gains " +
        "energy, semi-implicit Euler and Verlet stay bounded, and RK4 slowly loses it.",
    create: () => new IntegratorShootoutDemo(),
};
