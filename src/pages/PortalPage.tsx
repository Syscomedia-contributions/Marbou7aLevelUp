import { useEffect, useState } from "react";
import PortalPageImpl from "@/components/portal/PortalPage";
import {
  PORTAL_IMAGE_PRELOAD_URLS,
  portalBgContinuumDesktop,
  portalBgContinuumMobile,
  portalGlyphSprite,
  vortexImg,
} from "@/constants/portalConstants";
import vortexVideo from "@/assets/generated/vortex-loop.mp4";

/**
 * Preload every heavy asset the portal scene needs before mounting the
 * modular PortalPage. This prevents the state machine from mounting into a
 * still-loading DOM, which used to cause repeated virtual-DOM churn as
 * images popped in mid-animation.
 *
 * A hard fallback timeout guarantees we never block the UI longer than 2.5s.
 */
const CRITICAL_IMAGES = Array.from(
  new Set(
    [
      ...PORTAL_IMAGE_PRELOAD_URLS,
      portalBgContinuumDesktop,
      portalBgContinuumMobile,
      portalGlyphSprite,
      vortexImg,
      vortexVideo,
    ].filter(Boolean) as string[],
  ),
);

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

export default function PortalPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const done = () => {
      if (!cancelled) setReady(true);
    };

    Promise.all(CRITICAL_IMAGES.map(preloadImage)).then(done);
    // Safety net so we never keep users on the splash indefinitely.
    const fallback = window.setTimeout(done, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, []);

  if (!ready) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ backgroundColor: "hsl(245 45% 14%)" }}
        aria-busy="true"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
          <span className="text-sm text-white/70 tracking-widest uppercase">
            Loading portal…
          </span>
        </div>
      </div>
    );
  }

  return <PortalPageImpl />;
}
