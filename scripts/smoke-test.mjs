/**
 * Loads the built playground in Chrome and checks that it actually works. Type checks and
 * unit tests can't see a blank page: a build once dropped every component and they all
 * still passed.
 *
 * Usage, after `npm run build`: node scripts/smoke-test.mjs [base path, default /]
 */
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const base = process.argv[2] ?? '/';
const TIMEOUT_MS = 20_000;

const server = await preview({ base, logLevel: 'error', preview: { port: 4179 } });
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('The preview server has no local URL.');

const browser = await chromium.launch({
  channel: 'chrome',
  // No GPU in CI, so WebGL runs in software.
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

const failures = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(TIMEOUT_MS);
  page.on('pageerror', (e) => failures.push(`Uncaught error: ${e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} for ${r.url()}`);
  });
  // Software WebGL can log shader warnings now and then, so these don't fail the test.
  page.on('console', (m) => {
    if (m.type() === 'error') console.warn(`console error: ${m.text()}`);
  });

  /** Runs one check and records a failure, so a run reports everything it finds. */
  const check = async (name, fn) => {
    try {
      await fn();
      console.log(`ok    ${name}`);
    } catch (e) {
      failures.push(`${name}: ${e.message.split('\n')[0]}`);
      console.log(`FAIL  ${name}`);
    }
  };

  await page.goto(url);

  const demoSelect = page.locator('aether-sidebar select');

  await check('the app renders its sidebar', () => demoSelect.waitFor());

  await check('the stylesheet is applied', async () => {
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent'),
    );
    if (!accent.trim()) throw new Error('--accent is not set on :root');
  });

  await check('the viewport has a canvas', () => page.locator('aether-viewport canvas').waitFor());

  const demos = await demoSelect
    .locator('option')
    .evaluateAll((options) => options.map((o) => o.value))
    .catch(() => []);
  await check('demos are registered', async () => {
    if (demos.length === 0) throw new Error('the demo list is empty');
  });

  for (const id of demos) {
    await check(`demo "${id}" loads`, async () => {
      await demoSelect.selectOption(id);
      await page.waitForTimeout(250);
    });
  }

  await check('the gizmo panel renders its controls', async () => {
    await demoSelect.selectOption('rotation-gizmo');
    await page.locator('aether-gizmo-panel button', { hasText: 'Euler XYZ' }).click();
    await page.locator('aether-gizmo-panel aether-slider[label="Y"] input').waitFor();
  });
} finally {
  await browser.close();
  await server.close();
}

if (failures.length > 0) {
  console.error(`\nSmoke test failed:\n${failures.map((f) => `  - ${f}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('\nSmoke test passed.');
}
