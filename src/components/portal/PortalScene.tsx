import { useEffect, useRef } from "react";
import type { ReactNode, ComponentProps } from "react";
import { portalBgContinuumDesktop, portalBgContinuumMobile } from "@/constants/portalConstants";
import { usePortalAlignment } from "@/hooks/usePortalAlignment";
import { StargateRing } from "./";

interface PortalSceneProps extends ComponentProps<typeof StargateRing> {
  children?: ReactNode;
  className?: string;
}

export function PortalScene({ children, className, ...ringProps }: PortalSceneProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const bgDesktopRef = useRef<HTMLImageElement>(null);
  const bgMobileRef = useRef<HTMLImageElement>(null);
  const scrollTargetRef = useRef<HTMLDivElement>(null);

  const stage = ringProps.stage;
  const isIframe = ringProps.isIframe;

  usePortalAlignment(bgDesktopRef, bgMobileRef, sceneRef, sectionRef);

  // On first entry, center the viewport on the Stargate + counter/instruction + keyboard.
  // Also applies inside the "Comment jouer" tour-guide iframe on desktop so the
  // video-like guide shows the whole interaction block centered.
  useEffect(() => {
    // Inside the "Comment jouer" guide iframe, always use the full-block
    // centering (Stargate + counter/CTA + keyboard) even on narrow widths,
    // so every element stays visible and vertically centered.
    const isDesktop =
      isIframe || window.matchMedia("(min-width: 768px)").matches;
    const centerGuideViewport = () => {
      if (isDesktop) {
        // Desktop: center the whole portal interaction block (Stargate through keyboard).
        const scene = sceneRef.current;
        const controls = document.getElementById("portal-controls-anchor");
        if (scene && controls) {
          const sceneRect = scene.getBoundingClientRect();
          const controlsRect = controls.getBoundingClientRect();
          const top = sceneRect.top + window.scrollY;
          const bottom = controlsRect.bottom + window.scrollY;
          const centerY = (top + bottom) / 2;
          const viewportH = window.innerHeight;
          window.scrollTo({ top: Math.max(0, centerY - viewportH / 2), behavior: "auto" });
          return;
        }
      }
      // Mobile / fallback: keep the previous center-on-title+Stargate behavior.
      scrollTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    // The guide's keyboard and portal finish settling after fonts, artwork and
    // tour overlays mount. Re-center at each meaningful layout pass so the
    // final keyboard row cannot remain below the iframe viewport.
    const timers = [250, 900, 1600].map((delay) =>
      window.setTimeout(centerGuideViewport, delay),
    );
    const onResize = () => centerGuideViewport();
    window.addEventListener("resize", onResize);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", onResize);
    };
  }, [isIframe]);

  return (
    <section
      ref={sectionRef}
      className={`relative -mt-14 min-h-[calc(100svh+3.5rem)] flex flex-col overflow-visible ${isIframe ? "portal-iframe-popup" : ""} ${className ?? ""}`}
      style={{
        // Fallback color sampled from the very top of the extended sky, in case the
        // image hasn't loaded yet — prevents any flash of a different color.
        backgroundColor: "hsl(245 45% 14%)",
      }}
    >
      {/* Desktop: one continuous scene image includes the original portal landscape
          and its lower desert continuation, so the footer transition has no seam. */}
      <img
        ref={bgDesktopRef}
        src={portalBgContinuumDesktop}
        alt=""
        aria-hidden
        draggable={false}
        className="hidden md:block absolute left-1/2 bottom-[calc(-125vw*513/1920)] -translate-x-1/2 w-[125vw] h-auto max-w-none pointer-events-none select-none z-0"
      />
      {/* Desktop-only: extend the sky atmosphere to fill any empty area above the bg image. */}
      <div
        aria-hidden
        className="hidden md:block absolute inset-x-0 top-0 h-[55vh] pointer-events-none z-0"
        style={{
          background:
            "linear-gradient(to bottom, hsl(245 45% 14%) 0%, hsl(245 45% 14%) 55%, hsl(248 48% 18% / 0.85) 80%, hsl(250 50% 22% / 0) 100%)",
        }}
      />
      {/* Desktop-only starfield in the sky (mirrors the mobile background's stars) */}
      <div
        aria-hidden
        className="hidden md:block absolute inset-x-0 top-0 h-[55vh] pointer-events-none z-0 portal-stars-desktop"
      />

      {/* Mobile: same single continuous artwork, scaled so the staircase platform stays visible. */}
      <img
        ref={bgMobileRef}
        src={portalBgContinuumMobile}
        alt=""
        aria-hidden
        draggable={false}
        style={{
          height: "max(calc(var(--portal-mobile-vh, 100svh) * 1.6), calc(100vw * 2752 / 1071))",
          bottom: "calc(max(calc(var(--portal-mobile-vh, 100svh) * 1.6), calc(100vw * 2752 / 1071)) * -832 / 2752)",
        }}
        className="md:hidden absolute left-1/2 w-auto max-w-none -translate-x-1/2 pointer-events-none select-none z-0"
      />

      <div className="spotlight" />

      {/* Invisible anchor: on first entry we scroll the viewport so the title,
          Stargate, and counter/instruction are centered together. */}
      <div ref={scrollTargetRef} aria-hidden className="portal-scroll-target" />

      {stage === 5 && <div className="room-shockwave-flash" aria-hidden />}

      <div className={`relative w-full flex-1 flex flex-col items-center justify-center ${isIframe ? "portal-iframe-inner" : ""}`}>


        {/* Aspect-locked scene — platform reduced while keeping the Stargate enlarged */}
        <div
          ref={sceneRef}
          className="portal-scene-desktop-spacing absolute left-1/2 -translate-x-1/2 top-[26rem] md:relative md:top-auto md:left-auto md:translate-x-0 md:mx-auto md:mt-96 md:scale-[1.25] scene-mobile-sharp origin-bottom"
          style={{
            aspectRatio: "1920 / 1071",
            width: "min(100vw, calc(100svh * 1920 / 1071))",
            height: "min(100svh, calc(100vw * 1071 / 1920))",
          }}
        >
          {/* Stargate wrapper — base dynamically aligned with the visible
              staircase platform top via --stargate-bottom (set by the
              usePortalAlignment hook using bg-image rect + PLATFORM_RATIO).
              Fallback 57% is the previously hand-calibrated desktop value. */}
          <div
            className="absolute -translate-x-1/2 md:scale-[1.20] stargate-mobile-sharp origin-bottom"
            style={{
              left: "50%",
              bottom: "var(--stargate-bottom, 57%)",
              width: "23.4%",
              aspectRatio: "1 / 1",
            }}
          >
            <StargateRing {...ringProps} />
          </div>
        </div>

        {children}
      </div>
    </section>
  );
}
