/**
 * Loads the built demo app in Chrome and checks that it works. Type checks and unit tests
 * can't see a blank page.
 *
 * Usage, after `npm run build`: node scripts/smoke-test.mjs [base path, default /]
 */
import { chromium } from "playwright-core";
import { preview } from "vite";

const base = process.argv[2] ?? "/";
const TIMEOUT_MS = 20_000;
const DEMOS = [
    "orbits",
    "fireworks",
    "ballistics",
    "integrators",
    "cloth",
    "drumhead",
    "elastic-pendulum",
    "springs",
    "raft",
    "density-column",
    "buoyancy",
    "rotation",
];

const server = await preview({ base, logLevel: "error", preview: { port: 4179 } });
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error("The preview server has no local URL.");

const browser = await chromium.launch({
    channel: "chrome",
    // No GPU in CI, so WebGL runs in software.
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const failures = [];
try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultTimeout(TIMEOUT_MS);
    page.on("pageerror", (e) => failures.push(`Uncaught error: ${e.message}`));
    page.on("response", (r) => {
        if (r.status() >= 400) failures.push(`${r.status()} for ${r.url()}`);
    });
    page.on("console", (m) => {
        if (m.type() === "error") console.warn(`console error: ${m.text()}`);
    });

    /** Runs one check and records a failure, so a run reports everything it finds. */
    const check = async (name, fn) => {
        try {
            await fn();
            console.log(`ok    ${name}`);
        } catch (e) {
            failures.push(`${name}: ${e.message.split("\n")[0]}`);
            console.log(`FAIL  ${name}`);
        }
    };

    const open = async (hash) => {
        await page.goto(`${url}${hash}`);
        await page.locator("demo-stage canvas").waitFor();
        await page.waitForTimeout(400);
    };

    await page.goto(url);

    await check("the app renders the featured demo", () =>
        page.locator("demo-stage h1", { hasText: "Cloth" }).waitFor(),
    );

    await check("the stylesheet and palette are applied", async () => {
        const [accent, series] = await page.evaluate(() => {
            const style = getComputedStyle(document.documentElement);
            return [style.getPropertyValue("--accent"), style.getPropertyValue("--series-1")];
        });
        if (!accent.trim() || !series.trim()) throw new Error("--accent or --series-1 is not set");
    });

    await check("the stage paints", async () => {
        const painted = await page.locator("demo-stage canvas").evaluate((canvas) => {
            const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
            return gl !== null && canvas.width > 0;
        });
        if (!painted) throw new Error("the canvas has no WebGL context");
    });

    for (const id of DEMOS) {
        await check(`demo "${id}" loads with its parameters`, async () => {
            await open(`#/${id}`);
            const controls = await page.locator("axis-panel > *").count();
            if (controls === 0) throw new Error("no parameter controls rendered");
        });
    }

    await check("an unknown demo falls back to the featured one", async () => {
        await open("#/no-such-demo");
        await page.locator("demo-stage h1", { hasText: "Cloth" }).waitFor();
    });

    await check("moving a slider writes the URL", async () => {
        await open("#/springs");
        const range = page.locator('axis-slider[label="Stiffness"] input');
        await range.focus();
        await range.press("ArrowRight");
        await page.waitForFunction(() => location.hash.includes("stiffness=21"));
    });

    await check("parameters load from the URL", async () => {
        await open("#/buoyancy?density=1420");
        await page
            .locator("instance-bar .preset[aria-pressed=true]", { hasText: "Honey" })
            .waitFor();
    });

    await check("an instance morphs the parameters to its values", async () => {
        await open("#/cloth");
        await page.locator("instance-bar .preset", { hasText: "Gale" }).click();
        await page.waitForFunction(() => location.hash.includes("wind=14"));
    });

    await check("the ballistics demo fires and reports a shot", async () => {
        await open("#/ballistics?auto=0");
        await page.locator("instance-bar .preset", { hasText: "Laser" }).click();
        await page.locator("instance-bar .actions button", { hasText: "Fire" }).click();
        await page.locator("data-tabs [role=tab]", { hasText: "Readouts" }).click();
        await page.locator("data-tabs dd", { hasText: " s" }).first().waitFor();
    });

    await check("the orbits chart draws lines", async () => {
        await open("#/orbits");
        await page.locator("data-tabs [role=tab]", { hasText: "Charts" }).click();
        await page.waitForTimeout(1000);
        const painted = await page.locator("line-chart canvas").evaluate((canvas) => {
            const { data } = canvas
                .getContext("2d")
                .getImageData(0, 0, canvas.width, canvas.height);
            return data.some((_, i) => i % 4 === 3 && data[i] > 0);
        });
        if (!painted) throw new Error("the chart is blank");
    });

    await check("the code tab shows the demo's source", async () => {
        await open("#/springs");
        await page.locator("data-tabs [role=tab]", { hasText: "Code" }).click();
        await page
            .locator("code-view pre:not(.imports)", { hasText: "new ParticleAnchoredSpring" })
            .waitFor();
    });

    await check("the index lists every demo", async () => {
        await page.goto(`${url}#/demos`);
        await page.locator("demo-index h2", { hasText: "All demos" }).waitFor();
        const links = await page.locator("demo-index li a").count();
        if (links !== DEMOS.length)
            throw new Error(`expected ${DEMOS.length} demos, found ${links}`);
    });
} finally {
    await browser.close();
    await server.close();
}

if (failures.length > 0) {
    console.error(`\nSmoke test failed:\n${failures.map((f) => `  - ${f}`).join("\n")}`);
    process.exitCode = 1;
} else {
    console.log("\nSmoke test passed.");
}
