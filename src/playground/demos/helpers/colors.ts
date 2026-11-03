/**
 * Viewport colors. The axis colors match the --axis-* tokens in styles.css, so a
 * slider labelled "X" is the same red as the X arrow. Three.js can't read CSS
 * variables cheaply, so keep the two in step by hand.
 */
export const AXIS_COLORS = {
    x: 0xe5484d,
    y: 0x46a758,
    z: 0x3e63dd,
} as const;

/** Matches the --series-* tokens in styles.css (dark values, since the viewport is always dark). */
export const SERIES_COLORS = [0xff6b6f, 0x3cc9b4, 0xf0b429, 0xa78bfa] as const;

export const ACCENT = 0x2bb5a0;
export const WARN = 0xe8833a;
export const MUTED = 0xb0b8c4;
