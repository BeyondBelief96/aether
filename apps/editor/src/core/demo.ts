import type { Camera, Group } from "three";
import type { ParticleWorld, Vec3Like } from "aether-physics";
import type { ParamSchema, ParamValues } from "./params";
import type { ScenePalette } from "../stage/palette";

/**
 * Demo categories, grouped by what the demo simulates, in the order the app lists them. Each
 * category's demos live in `demos/<id>/`.
 */
export const CATEGORIES = [
    { id: "particles", label: "Particles" },
    { id: "soft-bodies", label: "Soft bodies" },
    { id: "fluids", label: "Fluids" },
    { id: "rigid-bodies", label: "Rigid bodies" },
    { id: "collisions", label: "Collisions" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

/** A named set of parameter values, offered as a one-click instance of the demo. */
export interface Preset<S extends ParamSchema> {
    readonly label: string;
    /** Short second line under the label. */
    readonly note?: string;
    readonly values: Partial<ParamValues<S>>;
    /** Physics rate the preset switches to, in Hz. */
    readonly hz?: number;
}

/** A one-shot command shown beside the presets, e.g. "Fire". */
export interface DemoAction {
    readonly id: string;
    readonly label: string;
    /** Single-character keyboard shortcut. */
    readonly key?: string;
}

/** Index into the theme's data series colours. */
export type SeriesIndex = 0 | 1 | 2 | 3;

export interface ChartSpec {
    readonly id: string;
    readonly title: string;
    readonly series: readonly { readonly label: string; readonly color: SeriesIndex }[];
    /** Vertical ranges the viewer can switch between. The first is the default. */
    readonly ranges: readonly {
        readonly label: string;
        readonly min: number;
        readonly max: number;
        readonly digits: number;
    }[];
    /** Value marked with a dashed line. */
    readonly reference?: number;
    /** Samples kept per series. */
    readonly capacity: number;
    /** Sentence for screen readers. */
    readonly description: string;
}

export interface Readout {
    readonly label: string;
    /** Formatted value, units included. */
    readonly value: string;
    readonly warn?: boolean;
}

export interface ReadoutGroup {
    readonly title: string;
    readonly color?: SeriesIndex;
    readonly rows: readonly Readout[];
}

/** A label drawn beside a point in the scene. */
export interface Callout {
    /** Read every frame, so it may be a live position. */
    readonly at: Readonly<Vec3Like>;
    readonly text: string;
    readonly color?: SeriesIndex;
}

/** What a demo may use of the viewport. */
export interface DemoView {
    readonly camera: Camera;
    /** The element that receives the viewport's pointer events. */
    readonly element: HTMLElement;
    /** Turns camera orbiting off while the demo drags something. */
    setOrbitEnabled(enabled: boolean): void;
}

export interface DemoContext<S extends ParamSchema> {
    /** Add everything the demo draws here. It is removed and disposed after `dispose`. */
    readonly root: Group;
    readonly view: DemoView;
    readonly palette: ScenePalette;
    /** Parameter values the demo starts with. */
    readonly values: ParamValues<S>;
    /** Changes parameters from inside the demo, e.g. when something is dragged. */
    set(values: Partial<ParamValues<S>>): void;
    /** Appends one sample per series to a chart. */
    plot(chartId: string, values: readonly number[]): void;
    /** Empties every chart. */
    clearCharts(): void;
    /**
     * Registers a world so the app's integrator setting applies to it, now and whenever the
     * setting changes. Returns `world`. A demo that sets its own integrators doesn't call it.
     */
    useWorld(world: ParticleWorld): ParticleWorld;
}

/** A running demo. */
export interface DemoInstance<S extends ParamSchema> {
    /** Advances the simulation by one fixed step of `dt` seconds. */
    step(dt: number): void;
    /** Moves the drawn objects to the state `alpha` of the way between the last two steps. */
    sync(alpha: number): void;
    /** Applies new parameter values. `changed` names the keys that differ from before. */
    update?(values: ParamValues<S>, changed: ReadonlySet<keyof S & string>): void;
    action?(id: string): void;
    /** Called a few times a second while readouts are shown. */
    readouts?(): readonly ReadoutGroup[];
    /** Called a few times a second for the labels drawn in the scene. */
    callouts?(): readonly Callout[];
    /** Frees anything not under `root`, such as listeners. */
    dispose?(): void;
}

export interface DemoDefinition<S extends ParamSchema = ParamSchema> {
    /** Stable identifier, used in URLs. */
    readonly id: string;
    readonly title: string;
    readonly category: CategoryId;
    /** One or two sentences: what is on screen. */
    readonly summary: string;
    /** One thing to try. */
    readonly hint?: string;
    readonly params: S;
    readonly presets?: readonly Preset<S>[];
    readonly actions?: readonly DemoAction[];
    readonly charts?: readonly ChartSpec[];
    readonly camera: { readonly position: Vec3Like; readonly target: Vec3Like };
    /** Physics rate the demo opens at. Defaults to 60 Hz. */
    readonly hz?: number;
    /** Path of the demo's source file, relative to the repository root. */
    readonly source: string;
    create(ctx: DemoContext<S>): DemoInstance<S>;
}

/** Identity helper that infers a demo's parameter types from its schema. */
export function defineDemo<S extends ParamSchema>(
    definition: DemoDefinition<S>,
): DemoDefinition<S> {
    return definition;
}
