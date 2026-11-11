/** Repository the demos' source links point to. */
export const REPOSITORY_URL = "https://github.com/BeyondBelief96/aether";

/** Version of the engine package the app is built against. */
export const ENGINE_VERSION: string = __AETHER_VERSION__;

declare global {
    const __AETHER_VERSION__: string;
}
