// constants/portalConstants.ts
// Central location for portal geometry, categories and asset URLs.

import portalFullUrl from "@/assets/portal-full.png";
import portalGlyphRingUrl from "@/assets/portal-glyph-ring.png";
import chevronBottomUrl from "@/assets/chevrons/chevron-bottom.png";
import chevronTopUrl from "@/assets/chevrons/chevron-top.png";
import chevronTopLitUrl from "@/assets/chevrons/chevron-top-lit.png";
import portalBgContinuumDesktopUrl from "@/assets/generated/portal-bg-continuum-desktop.png";
import portalBgContinuumMobileUrl from "@/assets/generated/portal-bg-continuum-mobile.png";
import cursorHandUrlAsset from "@/assets/cursor-hand.png";
import portalGlyphSpriteUrl from "@/assets/generated/portal-glyph-sprite.png";
import vortexImgUrl from "@/assets/portal-vortex-new.png";

import chev1 from "@/assets/chevrons/chevron-1.png";
import chev2 from "@/assets/chevrons/chevron-2.png";
import chev3 from "@/assets/chevrons/chevron-3.png";
import chev4 from "@/assets/chevrons/chevron-4.png";
import chev5 from "@/assets/chevrons/chevron-5.png";
import chev6 from "@/assets/chevrons/chevron-6.png";

import type { Cat } from "@/types/portal";

/* -------------------------------------------------------------------------- */
/*  Asset URLs                                                                */
/* -------------------------------------------------------------------------- */

export const portalFull = portalFullUrl;
export const portalGlyphRing = portalGlyphRingUrl;
export const chevronBottom = chevronBottomUrl;
export const chevronTop = chevronTopUrl;
export const chevronTopLit = chevronTopLitUrl;
export const portalBgContinuumDesktop = portalBgContinuumDesktopUrl;
export const portalBgContinuumMobile = portalBgContinuumMobileUrl;
export const cursorHandUrl = cursorHandUrlAsset;
export const portalGlyphSprite = portalGlyphSpriteUrl;
export const vortexImg = vortexImgUrl;

/* -------------------------------------------------------------------------- */
/*  Glyph asset URLs (per-index) from src/assets/glyphs/glyph_*.png           */
/* -------------------------------------------------------------------------- */

const GLYPH_ASSET_MODULES = import.meta.glob<{ default: string }>(
  "../assets/glyphs/glyph_*.png",
  { eager: true },
);

export const GLYPH_ASSET_URLS: string[] = (() => {
  const arr: string[] = [];
  for (const [path, mod] of Object.entries(GLYPH_ASSET_MODULES)) {
    const m = path.match(/glyph_(\d+)\.png$/);
    if (!m) continue;
    const idx = parseInt(m[1], 10) - 1;
    arr[idx] = mod.default;
  }
  return arr;
})();

export const glyphUrlForIndex = (glyphIndex: number): string => {
  const n = GLYPH_ASSET_URLS.length || 39;
  const slot = ((glyphIndex % n) + n) % n;
  return GLYPH_ASSET_URLS[slot];
};

/* -------------------------------------------------------------------------- */
/*  Categories / base keys & images                                           */
/* -------------------------------------------------------------------------- */

const BASE_KEYS = [
  "sport",
  "histo",
  "archeo",
  "art",
  "cine",
  "music",
  "sci",
  "logic",
  "tun",
  "cult",
];

const BASE_IMGS = [chev1, chev2, chev3, chev4, chev5, chev6];

/* -------------------------------------------------------------------------- */
/*  Ring geometry — glyph hit-zone centers traced from the reference image    */
/* -------------------------------------------------------------------------- */

export const GLYPH_POSITIONS = [
  { x: 49.6159, y: 6.1514 },
  { x: 57.5128, y: 6.6760 },
  { x: 64.3881, y: 8.0420 },
  { x: 71.0687, y: 11.4045 },
  { x: 76.7748, y: 15.1582 },
  { x: 82.3005, y: 19.8126 },
  { x: 86.2795, y: 25.4728 },
  { x: 89.7921, y: 31.3575 },
  { x: 92.1799, y: 37.8730 },
  { x: 93.5016, y: 45.0649 },
  { x: 94.0872, y: 52.0468 },
  { x: 93.5016, y: 58.3213 },
  { x: 91.4298, y: 65.7979 },
  { x: 88.2320, y: 71.9832 },
  { x: 84.2688, y: 77.6435 },
  { x: 79.4641, y: 83.0783 },
  { x: 73.3840, y: 87.4777 },
  { x: 67.1083, y: 90.5407 },
  { x: 60.0961, y: 92.5825 },
  { x: 52.8759, y: 93.7684 },
  { x: 46.0154, y: 93.5434 },
  { x: 38.9898, y: 92.6876 },
  { x: 32.2349, y: 90.1955 },
  { x: 26.0795, y: 86.9675 },
  { x: 20.3595, y: 82.5221 },
  { x: 15.5252, y: 77.2977 },
  { x: 11.5774, y: 71.5623 },
  { x: 8.6801, y: 64.9410 },
  { x: 6.8025, y: 58.3344 },
  { x: 5.8116, y: 51.4467 },
  { x: 5.8716, y: 44.9628 },
  { x: 7.4031, y: 37.7117 },
  { x: 10.2405, y: 31.4351 },
  { x: 13.7092, y: 25.5029 },
  { x: 18.0788, y: 19.3924 },
  { x: 23.6484, y: 15.1136 },
  { x: 29.2180, y: 11.2255 },
  { x: 35.5232, y: 8.5389 },
  { x: 42.6540, y: 6.5572 },
] as const;

export const RING_ANGLES: number[] = GLYPH_POSITIONS.map(
  ({ x, y }) => (Math.atan2(y - 50, x - 50) * 180) / Math.PI,
);

export const CATEGORIES: Cat[] = RING_ANGLES.map((_, i) => ({
  key: BASE_KEYS[i % BASE_KEYS.length],
  img: BASE_IMGS[i % BASE_IMGS.length],
}));

/* -------------------------------------------------------------------------- */
/*  Chevrons — 9 SG-1 slots around the external ring                          */
/* -------------------------------------------------------------------------- */

export const CHEVRON_COUNT = 9;
export const CHEVRON_ANGLES: number[] = Array.from(
  { length: CHEVRON_COUNT },
  (_, i) => i * 40,
);

/* -------------------------------------------------------------------------- */
/*  Image preload list (fired at module eval time in the page)                */
/* -------------------------------------------------------------------------- */

export const PORTAL_IMAGE_PRELOAD_URLS: string[] = [
  portalFull,
  portalGlyphRing,
  chevronBottom,
  chevronTop,
  chevronTopLit,
];
