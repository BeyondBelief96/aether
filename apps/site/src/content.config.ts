import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const docs = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/docs" }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        /** Position in the sidebar. */
        order: z.number(),
        /** Sidebar group. */
        group: z.enum(["Start", "Engine"]),
        /** A stub is an outline waiting for the API to settle. */
        stub: z.boolean().default(false),
    }),
});

export const collections = { docs };
