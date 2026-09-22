import { useLayoutEffect } from "react";

// PLATFORM_RATIO = height of the platform top, measured from the bottom of
// the source image, divided by image height. Calibrated visually:
//   - Desktop bg portal-bg-desert-v3.png (1920×1071) → 0.465
//   - Mobile  bg portal-bg-mobile.png    (1071×1920) → 0.325
const PLATFORM_RATIO_DESKTOP = 0.465;
const PLATFORM_RATIO_MOBILE = 0.325;
const CONTINUUM_ORIGINAL_RATIO_DESKTOP = 1071 / 1584;
const CONTINUUM_ORIGINAL_RATIO_MOBILE = 1920 / 2752;

/**
 * Dynamically aligns the Stargate base with the top of the visible staircase
 * platform in the background image, regardless of viewport size, aspect
 * ratio, image scaling, or which background is used (desktop vs mobile).
 *
 * Writes the computed offset to `--stargate-bottom` on the scene element,
 * and (on mobile) locks `--portal-mobile-vh` to a stable viewport height so
 * URL bar collapses don't reflow the portal.
 *
 * Recomputes on: initial mount, `ResizeObserver` on the scene + both bg
 * images, `resize` (desktop only), `orientationchange`, and each bg image's
 * `load` event.
 */
export function usePortalAlignment(
  bgDesktopRef: React.RefObject<HTMLImageElement | null>,
  bgMobileRef: React.RefObject<HTMLImageElement | null>,
  sceneRef: React.RefObject<HTMLDivElement | null>,
  sectionRef: React.RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const setStableMobileViewport = (force = false) => {
      const section = sectionRef.current;
      if (!section) return;
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      if (isDesktop) {
        section.style.removeProperty("--portal-mobile-vh");
        return;
      }
      if (force || !section.style.getPropertyValue("--portal-mobile-vh")) {
        section.style.setProperty("--portal-mobile-vh", `${window.innerHeight}px`);
      }
    };

    const getRenderedRect = (img: HTMLImageElement, objectCoverBottom: boolean) => {
      const rect = img.getBoundingClientRect();
      if (!objectCoverBottom) return { top: rect.top, bottom: rect.bottom, height: rect.height };
      const nW = img.naturalWidth;
      const nH = img.naturalHeight;
      if (!nW || !nH) return { top: rect.top, bottom: rect.bottom, height: rect.height };
      const cW = rect.width;
      const cH = rect.height;
      const imgAR = nW / nH;
      const contAR = cW / cH;
      let renderedH: number;
      if (imgAR > contAR) {
        // Image fills container height, cropped horizontally
        renderedH = cH;
      } else {
        // Image fills container width, cropped vertically — anchored to bottom
        renderedH = cW / imgAR;
      }
      return { top: rect.bottom - renderedH, bottom: rect.bottom, height: renderedH };
    };

    const update = () => {
      setStableMobileViewport();
      const scene = sceneRef.current;
      if (!scene) return;
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      const bgImg = isDesktop ? bgDesktopRef.current : bgMobileRef.current;
      if (!bgImg || !bgImg.complete || !bgImg.naturalHeight) return;
      const ratio = isDesktop ? PLATFORM_RATIO_DESKTOP : PLATFORM_RATIO_MOBILE;
      const rendered = getRenderedRect(bgImg, !isDesktop);
      const originalHeight =
        rendered.height *
        (isDesktop
          ? CONTINUUM_ORIGINAL_RATIO_DESKTOP
          : CONTINUUM_ORIGINAL_RATIO_MOBILE);
      const originalBottom = rendered.bottom - (rendered.height - originalHeight);
      const bg = { bottom: originalBottom, height: originalHeight };
      const platformTopY = bg.bottom - bg.height * ratio;
      const sceneRect = scene.getBoundingClientRect();
      if (sceneRect.height <= 0) return;
      const bottomPx = sceneRect.bottom - platformTopY;
      const pct = (bottomPx / sceneRect.height) * 100;
      scene.style.setProperty("--stargate-bottom", `${pct.toFixed(3)}%`);
    };

    update();
    const ro = new ResizeObserver(update);
    if (sceneRef.current) ro.observe(sceneRef.current);
    if (bgDesktopRef.current) ro.observe(bgDesktopRef.current);
    if (bgMobileRef.current) ro.observe(bgMobileRef.current);

    const handleResize = () => {
      if (window.matchMedia("(min-width: 768px)").matches) update();
    };
    const handleOrientationChange = () => {
      sectionRef.current?.style.removeProperty("--portal-mobile-vh");
      window.setTimeout(() => {
        setStableMobileViewport(true);
        update();
      }, 250);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientationChange);
    const imgs = [bgDesktopRef.current, bgMobileRef.current].filter(
      Boolean,
    ) as HTMLImageElement[];
    imgs.forEach((img) => img.addEventListener("load", update));

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
      imgs.forEach((img) => img.removeEventListener("load", update));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
