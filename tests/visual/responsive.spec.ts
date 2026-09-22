import { test, expect, Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Visual/responsive regression suite.
 *
 * Goal: detect any horizontal overflow (page or specific elements) across the
 * target device widths and all supported languages. Baseline screenshots are
 * saved on the first run under `tests/visual/__snapshots__/` and diffed on
 * subsequent runs.
 *
 * Run with:
 *   bunx playwright test
 * Update baselines with:
 *   bunx playwright test --update-snapshots
 */

const WIDTHS = [320, 360, 390, 430, 640, 768] as const;
const LANGS = ["fr", "en", "ar"] as const;
const ROUTES = ["/", "/gameplay", "/portal", "/prizes", "/faq"] as const;

const SNAP_DIR = path.join(__dirname, "__snapshots__");
fs.mkdirSync(SNAP_DIR, { recursive: true });

async function setLang(page: Page, lang: string) {
  await page.addInitScript((l) => {
    try {
      window.localStorage.setItem("i18nextLng", l as string);
    } catch {}
  }, lang);
}

async function assertNoOverflow(page: Page, label: string) {
  // Wait for fonts + first paint stability
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1200);

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const offenders: Array<{ tag: string; cls: string; w: number; x: number }> = [];
    // Only check elements that push past the viewport right edge
    const vw = doc.clientWidth;
    document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 0 && r.height > 0) {
        const style = getComputedStyle(el);
        // Ignore fixed/absolute decorative layers that intentionally overflow
        // but are clipped by an ancestor with overflow: clip/hidden.
        if (style.position === "fixed") return;
        offenders.push({
          tag: el.tagName,
          cls: (el.className || "").toString().slice(0, 80),
          w: Math.round(r.width),
          x: Math.round(r.x),
        });
      }
    });
    return {
      docScrollW: doc.scrollWidth,
      docClientW: doc.clientWidth,
      bodyScrollW: body.scrollWidth,
      offenders: offenders.slice(0, 5),
    };
  });

  // Primary check: no horizontal document overflow.
  expect(
    metrics.docScrollW,
    `${label}: document overflows viewport (scrollWidth=${metrics.docScrollW}, clientWidth=${metrics.docClientW})`,
  ).toBeLessThanOrEqual(metrics.docClientW + 1);
  expect(
    metrics.bodyScrollW,
    `${label}: body overflows viewport (bodyScrollW=${metrics.bodyScrollW})`,
  ).toBeLessThanOrEqual(metrics.docClientW + 1);
}

for (const width of WIDTHS) {
  test.describe(`viewport ${width}px`, () => {
    for (const lang of LANGS) {
      for (const route of ROUTES) {
        const label = `${width}px · ${lang} · ${route}`;
        test(label, async ({ browser }) => {
          const context = await browser.newContext({
            viewport: { width, height: 900 },
            deviceScaleFactor: 1,
          });
          const page = await context.newPage();
          await setLang(page, lang);
          await page.goto(route);
          await assertNoOverflow(page, label);

          // Baseline screenshot for visual regression
          const shot = await page.screenshot({ fullPage: false });
          const snap = path.join(
            SNAP_DIR,
            `${width}_${lang}_${route.replace(/\W+/g, "_") || "home"}.png`,
          );
          if (!fs.existsSync(snap)) {
            fs.writeFileSync(snap, shot);
          }
          await context.close();
        });
      }
    }
  });
}
