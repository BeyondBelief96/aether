import type { Vec3Like } from "aether-physics";

/** A continuous value set with a slider. */
export interface NumberParam {
    readonly kind: "number";
    readonly label: string;
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly default: number;
    /** Suffix shown after the value, e.g. `" N/m"`. */
    readonly unit?: string;
    /** Decimals shown. Defaults to the decimals in `step`. */
    readonly digits?: number;
    /** CSS colour for the label, e.g. an axis colour. */
    readonly color?: string;
    readonly hidden?: (values: Readonly<Record<string, ParamValue>>) => boolean;
}

/** One of a fixed set of options. */
export interface ChoiceParam<T extends string = string> {
    readonly kind: "choice";
    readonly label: string;
    readonly options: readonly { readonly value: T; readonly label: string }[];
    readonly default: T;
    readonly hidden?: (values: Readonly<Record<string, ParamValue>>) => boolean;
}

export interface ToggleParam {
    readonly kind: "toggle";
    readonly label: string;
    readonly default: boolean;
    readonly hidden?: (values: Readonly<Record<string, ParamValue>>) => boolean;
}

/** A 3D vector typed per component. */
export interface Vec3Param {
    readonly kind: "vec3";
    readonly label: string;
    readonly default: Readonly<Vec3Like>;
    /** Rejects the zero vector, for directions. */
    readonly nonzero?: boolean;
    readonly digits?: number;
    readonly hidden?: (values: Readonly<Record<string, ParamValue>>) => boolean;
}

export type Param = NumberParam | ChoiceParam | ToggleParam | Vec3Param;
export type ParamValue = number | string | boolean | Readonly<Vec3Like>;
export type ParamSchema = Readonly<Record<string, Param>>;

type ValueOf<P extends Param> = P extends NumberParam
    ? number
    : P extends ChoiceParam<infer T>
      ? T
      : P extends ToggleParam
        ? boolean
        : Readonly<Vec3Like>;

/** The current value of every parameter in a schema. */
export type ParamValues<S extends ParamSchema> = { readonly [K in keyof S]: ValueOf<S[K]> };

export const number = (spec: Omit<NumberParam, "kind">): NumberParam => ({
    kind: "number",
    ...spec,
});
export const choice = <T extends string>(spec: Omit<ChoiceParam<T>, "kind">): ChoiceParam<T> => ({
    kind: "choice",
    ...spec,
});
export const toggle = (spec: Omit<ToggleParam, "kind">): ToggleParam => ({
    kind: "toggle",
    ...spec,
});
export const vec3 = (spec: Omit<Vec3Param, "kind">): Vec3Param => ({ kind: "vec3", ...spec });

/** Decimals a number parameter displays. */
export function digitsOf(param: NumberParam): number {
    if (param.digits !== undefined) return param.digits;
    const text = String(param.step);
    const dot = text.indexOf(".");
    return dot === -1 ? 0 : text.length - dot - 1;
}

export function defaults<S extends ParamSchema>(schema: S): ParamValues<S> {
    const values: Record<string, ParamValue> = {};
    for (const [key, param] of Object.entries(schema)) values[key] = param.default;
    return values as ParamValues<S>;
}

/**
 * Coerces `value` to something `param` accepts, or returns `undefined` when it can't.
 * Numbers are clamped and snapped to `step`.
 */
export function sanitize(param: Param, value: unknown): ParamValue | undefined {
    switch (param.kind) {
        case "number": {
            if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
            const clamped = Math.min(param.max, Math.max(param.min, value));
            const snapped = param.min + Math.round((clamped - param.min) / param.step) * param.step;
            return Number(Math.min(param.max, snapped).toFixed(digitsOf(param) + 2));
        }
        case "choice":
            return param.options.some((o) => o.value === value) ? (value as string) : undefined;
        case "toggle":
            return typeof value === "boolean" ? value : undefined;
        case "vec3": {
            if (typeof value !== "object" || value === null) return undefined;
            const { x, y, z } = value as Record<string, unknown>;
            if (![x, y, z].every((c) => typeof c === "number" && Number.isFinite(c)))
                return undefined;
            const v = { x: x as number, y: y as number, z: z as number };
            if (param.nonzero && v.x === 0 && v.y === 0 && v.z === 0) return undefined;
            return v;
        }
    }
}

export function sameValue(a: ParamValue, b: ParamValue): boolean {
    if (typeof a === "object" && typeof b === "object") {
        return a.x === b.x && a.y === b.y && a.z === b.z;
    }
    return a === b;
}

/** Text form of a value, as used in URLs. */
export function encodeValue(param: Param, value: ParamValue): string {
    switch (param.kind) {
        case "number":
            return String(value);
        case "choice":
            return value as string;
        case "toggle":
            return value ? "1" : "0";
        case "vec3": {
            const v = value as Vec3Like;
            return `${v.x},${v.y},${v.z}`;
        }
    }
}

/** Parses the text form of a value. `undefined` when the text is not valid for `param`. */
export function decodeValue(param: Param, text: string): ParamValue | undefined {
    switch (param.kind) {
        case "number":
            return text.trim() === "" ? undefined : sanitize(param, Number(text));
        case "choice":
            return sanitize(param, text);
        case "toggle":
            return text === "1" ? true : text === "0" ? false : undefined;
        case "vec3": {
            const parts = text.split(",").map(Number);
            if (parts.length !== 3) return undefined;
            const [x, y, z] = parts as [number, number, number];
            return sanitize(param, { x, y, z });
        }
    }
}

/** Every value that differs from its default, in text form. */
export function encodeValues<S extends ParamSchema>(
    schema: S,
    values: ParamValues<S>,
): URLSearchParams {
    const query = new URLSearchParams();
    for (const [key, param] of Object.entries(schema)) {
        const value = values[key] as ParamValue;
        if (!sameValue(value, param.default)) query.set(key, encodeValue(param, value));
    }
    return query;
}

/** Defaults overridden by every valid entry in `query`. Unknown and invalid entries are ignored. */
export function decodeValues<S extends ParamSchema>(
    schema: S,
    query: URLSearchParams,
): ParamValues<S> {
    const values: Record<string, ParamValue> = { ...defaults(schema) };
    for (const [key, param] of Object.entries(schema)) {
        const text = query.get(key);
        if (text === null) continue;
        const value = decodeValue(param, text);
        if (value !== undefined) values[key] = value;
    }
    return values as ParamValues<S>;
}
