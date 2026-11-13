import { Group } from "three";
import { FixedStepLoop, type ParticleWorld } from "aether-physics";
import {
    CHART_SAMPLE_RATE,
    type Callout,
    type ChartSpec,
    type DemoDefinition,
    type DemoInstance,
    type DemoView,
    type ReadoutGroup,
} from "./demo";
import { type ParamSchema, type ParamValue, type ParamValues, sameValue, sanitize } from "./params";
import { RingBuffer } from "./ring-buffer";
import { Ticker } from "./ticker";
import type { ScenePalette } from "../stage/palette";
import { disposeObject } from "../demos/helpers/three";
import { DEFAULT_INTEGRATOR, makeIntegrator, type IntegratorChoice } from "./integrators";

const STATS_INTERVAL_MS = 250;

/** Physics rates the transport offers, in Hz. Every demo must stay stable at each of them. */
export const PHYSICS_RATES = [10, 15, 30, 60, 120, 240] as const;

/** The samples of one chart, one ring buffer per series. */
export class ChartData {
    readonly spec: ChartSpec;
    readonly buffers: readonly RingBuffer[];
    /** Samples kept per series. */
    readonly capacity: number;
    /** Increments on every change, so a view can tell when to redraw. */
    version = 0;

    constructor(spec: ChartSpec) {
        this.spec = spec;
        this.capacity = Math.round(spec.seconds * CHART_SAMPLE_RATE);
        this.buffers = spec.series.map(() => new RingBuffer(this.capacity));
    }

    push(values: readonly number[]): void {
        this.buffers.forEach((buffer, i) => buffer.push(values[i] ?? NaN));
        this.version++;
    }

    clear(): void {
        for (const buffer of this.buffers) buffer.clear();
        this.version++;
    }
}

export interface LoopStats {
    readonly fps: number;
    readonly stepsPerFrame: number;
    readonly simTime: number;
    readonly droppedTime: boolean;
}

export interface SessionHost {
    readonly view: DemoView;
    readonly palette: ScenePalette;
    /** Adds the demo's root to the scene. */
    attach(root: Group): void;
    detach(root: Group): void;
    /** Called once the demo has built its scene, e.g. to set up shadows. */
    prepare?(root: Group): void;
}

/**
 * One demo running on a fixed-step loop: its instance, parameter values, charts and loop
 * statistics. Knows nothing about the interface; listeners hear about changes.
 */
export class DemoSession<S extends ParamSchema = ParamSchema> {
    readonly definition: DemoDefinition<S>;
    readonly loop: FixedStepLoop;
    readonly charts: ReadonlyMap<string, ChartData>;
    /** Draw between the last two steps. Off, each frame shows the latest step as it is. */
    interpolate = true;

    #host: SessionHost;
    #values: ParamValues<S>;
    #instance: DemoInstance<S> | null = null;
    #root: Group | null = null;
    #stats: LoopStats = { fps: 0, stepsPerFrame: 0, simTime: 0, droppedTime: false };
    #window = { start: 0, frames: 0, steps: 0, dropped: false };
    #integrator: IntegratorChoice = DEFAULT_INTEGRATOR;
    /** Worlds the demo registered with `useWorld`, kept on the chosen integrator. */
    #worlds = new Set<ParticleWorld>();
    #sampleClock = new Ticker(1 / CHART_SAMPLE_RATE);
    #onValues = new Set<(values: ParamValues<S>) => void>();
    #onStats = new Set<(stats: LoopStats) => void>();

    constructor(definition: DemoDefinition<S>, values: ParamValues<S>, host: SessionHost) {
        this.definition = definition;
        this.#host = host;
        this.#values = values;
        this.loop = new FixedStepLoop(definition.hz ?? 60);
        this.charts = new Map(
            (definition.charts ?? []).map((spec) => [spec.id, new ChartData(spec)]),
        );
        this.#start();
    }

    get values(): ParamValues<S> {
        return this.#values;
    }

    get stats(): LoopStats {
        return this.#stats;
    }

    /** Integrator every registered world steps with. Takes effect from the next step. */
    get integrator(): IntegratorChoice {
        return this.#integrator;
    }

    set integrator(choice: IntegratorChoice) {
        this.#integrator = choice;
        for (const world of this.#worlds) world.integrator = makeIntegrator(choice);
    }

    /** Whether the demo registered any world, so the integrator setting has an effect. */
    get usesIntegrator(): boolean {
        return this.#worlds.size > 0;
    }

    /** Recreates the demo from its current parameter values. */
    reset(): void {
        this.#stop();
        this.loop.reset();
        this.#clearCharts();
        this.#start();
    }

    /** Swaps the host, e.g. after a theme change, and restarts the demo. */
    rehost(host: SessionHost): void {
        this.#stop();
        this.#host = host;
        this.#start();
    }

    /**
     * Sets parameters. Invalid values are dropped and numbers are clamped to their range.
     * Returns whether anything changed.
     */
    set(partial: Partial<Record<keyof S & string, unknown>>): boolean {
        const next: Record<string, ParamValue> = { ...this.#values };
        const changed = new Set<keyof S & string>();
        for (const [key, raw] of Object.entries(partial)) {
            const param = this.definition.params[key];
            if (!param) continue;
            const value = sanitize(param, raw);
            if (value === undefined || sameValue(value, next[key] as ParamValue)) continue;
            next[key] = value;
            changed.add(key as keyof S & string);
        }
        if (changed.size === 0) return false;
        this.#values = next as ParamValues<S>;
        this.#instance?.update?.(this.#values, changed);
        for (const listener of this.#onValues) listener(this.#values);
        return true;
    }

    /** Runs `seconds` of simulation at once, e.g. so a scene opens mid-motion. */
    warmup(seconds: number): void {
        const instance = this.#instance;
        if (!instance) return;
        const dt = this.loop.dt;
        for (let t = 0; t < seconds; t += dt) this.#step(instance, dt);
        instance.sync(1);
    }

    action(id: string): void {
        this.#instance?.action?.(id);
    }

    readouts(): readonly ReadoutGroup[] {
        return this.#instance?.readouts?.() ?? [];
    }

    callouts(): readonly Callout[] {
        return this.#instance?.callouts?.() ?? [];
    }

    /** Runs the steps due at `now` and moves the drawn objects. */
    frame(now: number): void {
        const instance = this.#instance;
        const result = this.loop.advance(now, (dt) => {
            if (instance) this.#step(instance, dt);
        });
        instance?.sync(this.interpolate ? result.alpha : 1);

        const w = this.#window;
        if (w.start === 0) w.start = now;
        w.frames++;
        w.steps += result.steps;
        w.dropped ||= result.droppedTime;
        const elapsed = now - w.start;
        if (elapsed < STATS_INTERVAL_MS) return;
        this.#stats = {
            fps: (w.frames * 1000) / elapsed,
            stepsPerFrame: w.steps / w.frames,
            simTime: this.loop.simTime,
            droppedTime: w.dropped,
        };
        this.#window = { start: now, frames: 0, steps: 0, dropped: false };
        for (const listener of this.#onStats) listener(this.#stats);
    }

    onValues(listener: (values: ParamValues<S>) => void): () => void {
        this.#onValues.add(listener);
        return () => this.#onValues.delete(listener);
    }

    onStats(listener: (stats: LoopStats) => void): () => void {
        this.#onStats.add(listener);
        return () => this.#onStats.delete(listener);
    }

    dispose(): void {
        this.#stop();
        this.#onValues.clear();
        this.#onStats.clear();
    }

    #start(): void {
        const root = new Group();
        this.#root = root;
        this.#host.attach(root);
        this.#instance = this.definition.create({
            root,
            view: this.#host.view,
            palette: this.#host.palette,
            values: this.#values,
            set: (values) => {
                this.set(values);
            },
            clearCharts: () => this.#clearCharts(),
            useWorld: (world) => {
                world.integrator = makeIntegrator(this.#integrator);
                this.#worlds.add(world);
                return world;
            },
        });
        this.#host.prepare?.(root);
        this.#instance.sync(1);
    }

    /** Steps the demo, then records the chart samples that fell due. */
    #step(instance: DemoInstance<S>, dt: number): void {
        instance.step(dt);
        if (!instance.sample || this.charts.size === 0) return;
        const due = this.#sampleClock.advance(dt);
        if (due === 0) return;
        const samples = instance.sample();
        if (!samples) return;
        for (const [id, values] of Object.entries(samples)) {
            const chart = this.charts.get(id);
            if (chart) for (let i = 0; i < due; i++) chart.push(values);
        }
    }

    #clearCharts(): void {
        this.#sampleClock.reset();
        for (const chart of this.charts.values()) chart.clear();
    }

    #stop(): void {
        this.#instance?.dispose?.();
        this.#instance = null;
        this.#worlds.clear();
        if (this.#root) {
            this.#host.detach(this.#root);
            disposeObject(this.#root);
            this.#root = null;
        }
    }
}
