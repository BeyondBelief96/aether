/** Splits a module into its leading import statements and the rest. */
export function splitImports(source: string): [imports: string, body: string] {
    const match = /^(?:\s*import[\s\S]*?from\s*"[^"]*";\n)+/.exec(source);
    if (!match) return ["", source];
    return [match[0].replace(/^\n+/, ""), source.slice(match[0].length).replace(/^\n+/, "")];
}
