export { ENGINE_VERSION, REPOSITORY_URL } from "@aether/editor/site";

/** Prefixes a site path with the deploy base, e.g. `/aether/` on GitHub Pages. */
export function href(path: string): string {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
