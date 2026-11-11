/** Where the app is: a demo with parameter overrides, or the index of all demos. */
export type Route =
    | { readonly view: "demo"; readonly id: string; readonly query: URLSearchParams }
    | { readonly view: "index" };

/**
 * Parses a location hash: `#/springs?stiffness=40` is a demo, `#/demos` the index, and an
 * empty hash the default demo (id `""`).
 */
export function parseHash(hash: string): Route {
    const path = hash.replace(/^#\/?/, "");
    const queryStart = path.indexOf("?");
    const id = decodeURIComponent(queryStart === -1 ? path : path.slice(0, queryStart));
    if (id === "demos") return { view: "index" };
    const query = new URLSearchParams(queryStart === -1 ? "" : path.slice(queryStart + 1));
    return { view: "demo", id, query };
}

export function formatHash(route: Route): string {
    if (route.view === "index") return "#/demos";
    const query = route.query.toString();
    return `#/${encodeURIComponent(route.id)}${query ? `?${query}` : ""}`;
}
