/** Where the app is: a demo with parameter overrides, or the index of all demos. */
export type Route =
    | { readonly view: "demo"; readonly id: string; readonly query: URLSearchParams }
    | { readonly view: "index" };

/**
 * Whether `hash` is an app route (`#/...`) rather than an in-page anchor such as `#content`.
 * An empty hash counts as a route to the default demo.
 */
export function isRouteHash(hash: string): boolean {
    return hash === "" || hash === "#" || hash.startsWith("#/");
}

/**
 * Parses a location hash: `#/springs?stiffness=40` is a demo, `#/demos` the index, and an
 * empty hash or an in-page anchor the default demo (id `""`).
 */
export function parseHash(hash: string): Route {
    if (!isRouteHash(hash)) return { view: "demo", id: "", query: new URLSearchParams() };
    const path = hash.replace(/^#\/?/, "");
    const queryStart = path.indexOf("?");
    const rawId = queryStart === -1 ? path : path.slice(0, queryStart);
    let id: string;
    try {
        id = decodeURIComponent(rawId);
    } catch {
        // A malformed escape, e.g. a truncated link: keep the raw text, which matches no demo.
        id = rawId;
    }
    if (id === "demos") return { view: "index" };
    const query = new URLSearchParams(queryStart === -1 ? "" : path.slice(queryStart + 1));
    return { view: "demo", id, query };
}

export function formatHash(route: Route): string {
    if (route.view === "index") return "#/demos";
    const query = route.query.toString();
    return `#/${encodeURIComponent(route.id)}${query ? `?${query}` : ""}`;
}
