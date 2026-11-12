/**
 * Column count for `count` options in `width` pixels when each needs `optionWidth`: as few
 * rows as fit, with the options spread evenly across them (four options in a space for three
 * become two rows of two, not three and one).
 */
export function choiceColumns(count: number, width: number, optionWidth: number): number {
    if (count <= 1 || optionWidth <= 0) return Math.max(count, 1);
    // Options share a 1px rule, so n options need n·w + (n − 1) pixels.
    const fit = Math.max(1, Math.min(count, Math.floor((width + 1) / (optionWidth + 1))));
    const rows = Math.ceil(count / fit);
    return Math.ceil(count / rows);
}

/** Columns the last of `count` options spans so it fills the rest of its row. */
export function lastSpan(count: number, columns: number): number {
    return columns - ((Math.max(count, 1) - 1) % columns);
}
