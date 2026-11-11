export const EPSILON = 1e-6;

export function approxEqual(a: number, b: number, epsilon = EPSILON): boolean {
    if (a === b) return true;
    const diff = Math.abs(a - b);
    return Number.isFinite(diff) && diff <= epsilon * Math.max(1, Math.abs(a), Math.abs(b));
}

export function clamp(value: number, min: number, max: number): number {
    return value < min ? min : value > max ? max : value;
}
