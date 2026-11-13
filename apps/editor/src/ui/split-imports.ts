/** Splits a module into its leading import statements and the rest. */
export function splitImports(source: string): [imports: string, body: string] {
    const match = /^(?:\s*import[\s\S]*?from\s*"[^"]*";\n)+/.exec(source);
    if (!match) return ["", source];
    return [match[0].replace(/^\n+/, ""), source.slice(match[0].length).replace(/^\n+/, "")];
}

/** Names of the modules `source` imports from its own folder, in order: `"./bridge-sim"` gives `bridge-sim`. */
export function localImports(source: string): string[] {
    const [imports] = splitImports(source);
    return [...imports.matchAll(/from\s*"\.\/([^"/]+)"/g)].map((match) => match[1]!);
}
