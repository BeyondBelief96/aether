const FIGURE_SPACE = "\u2007";
const MINUS = "\u2212";

export const RAD_TO_DEG = 180 / Math.PI;
export const DEG_TO_RAD = Math.PI / 180;

/**
 * Formats `value` with a fixed number of decimals and a sign column, so numbers line up
 * and don't jitter as they change: " 1.000", "−0.250".
 *
 * Values that round to zero print as " 0.000", never "−0.000". Non-finite values print "—".
 */
export function formatNumber(value: number, digits = 3): string {
    if (!Number.isFinite(value)) return "—";
    // Rounding first turns −0.0001 into −0, and `−0 < 0` is false, so it gets no minus.
    const rounded = Number(value.toFixed(digits));
    const sign = rounded < 0 ? MINUS : FIGURE_SPACE;
    return sign + Math.abs(rounded).toFixed(digits);
}

export const formatDegrees = (radians: number, digits = 1): string => {
    return `${formatNumber(radians * RAD_TO_DEG, digits)}°`;
};
