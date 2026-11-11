/**
 * Colours shared by the 3D stage and the interface. The interface reads them as CSS custom
 * properties (`--series-1`, `--axis-x`, ...), which `applyPalette` writes, so a series is the
 * same colour in a chart, a readout and the scene.
 */
export interface ScenePalette {
    readonly theme: "light" | "dark";
    /** Stage background. */
    readonly ground: number;
    readonly gridMajor: number;
    readonly gridMinor: number;
    /** Main body colour. */
    readonly ink: number;
    /** Secondary bodies, fixtures and inactive lines. */
    readonly muted: number;
    readonly accent: number;
    readonly warn: number;
    /** Data series, in order. */
    readonly series: readonly [number, number, number, number];
    readonly axis: { readonly x: number; readonly y: number; readonly z: number };
    /** Translucent liquid. */
    readonly liquid: number;
}

export const LIGHT: ScenePalette = {
    theme: "light",
    ground: 0xecebe6,
    gridMajor: 0xb9b8b1,
    gridMinor: 0xd9d8d2,
    ink: 0x161616,
    muted: 0x8e8d87,
    accent: 0xff4b1f,
    warn: 0xd6361b,
    series: [0xff4b1f, 0x2747d6, 0x0f8a5f, 0x8a3fd1],
    axis: { x: 0xd7263d, y: 0x2e9e4f, z: 0x2b59d9 },
    liquid: 0x6f9ed6,
};

export const DARK: ScenePalette = {
    theme: "dark",
    ground: 0x1a1a18,
    gridMajor: 0x45443f,
    gridMinor: 0x2a2a27,
    ink: 0xedece6,
    muted: 0x77766f,
    accent: 0xff5a2e,
    warn: 0xff6a3d,
    series: [0xff5a2e, 0x7d97ff, 0x3ccf8e, 0xc08bff],
    axis: { x: 0xff5c6c, y: 0x5fd17f, z: 0x6f93ff },
    liquid: 0x3d6ea8,
};

export const hex = (color: number): string => `#${color.toString(16).padStart(6, "0")}`;

/** Writes the palette's data colours to `root` as CSS custom properties. */
export function applyPalette(root: HTMLElement, palette: ScenePalette): void {
    palette.series.forEach((color, i) => root.style.setProperty(`--series-${i + 1}`, hex(color)));
    root.style.setProperty("--axis-x", hex(palette.axis.x));
    root.style.setProperty("--axis-y", hex(palette.axis.y));
    root.style.setProperty("--axis-z", hex(palette.axis.z));
}
