// components/portal/VortexCore.tsx
import { useEffect, useRef, useState } from "react";
import vortexVideo from "@/assets/generated/vortex-loop.mp4";

interface VortexCoreProps {
  /** Continuous rotation angle applied on top of the video's own flow.
   *  Keeps the ring's dialing rotation coupled to the vortex without
   *  making the vortex read as a plain rotating texture. */
  rotation: number;
  /** Whether the vortex should be visually visible.
   *  The video element is always kept alive and playing from mount so
   *  that mobile browsers allow it to be primed by the first user tap. */
  visible?: boolean;
}

/**
 * Living-energy vortex inspired by the Stargate SG-1 event horizon.
 *
 * Rather than rotating a static texture, we composite two copies of a
 * looping vortex clip at different scales, opposite subtle rotations
 * and staggered playback offsets. Combined with `mix-blend-mode` and
 * a CSS luminosity pulse, the result reads as an organic liquid flow
 * with internal currents rather than a spinning image.
 *
 * Perf notes:
 *  - Single <video> asset reused twice via two <video> elements sharing
 *    the same src — the browser dedupes the network fetch.
 *  - `playsInline` + `muted` + `autoPlay` = mobile-safe autoplay.
 *  - No JS animation loop; all motion is CSS + native video playback.
 */
export function VortexCore({ rotation, visible = true }: VortexCoreProps) {
  const primaryRef = useRef<HTMLVideoElement | null>(null);
  const secondaryRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Kick playback + stagger the two layers so the loop never lines up.
  // The element is mounted early (even while hidden) so the first user
  // gesture on the portal unlocks autoplay on iOS before the vortex
  // needs to become visible.
  useEffect(() => {
    const play = (el: HTMLVideoElement | null, offset: number) => {
      if (!el) return;
      const start = () => {
        try {
          if (Number.isFinite(el.duration) && el.duration > 0) {
            el.currentTime = offset % el.duration;
          }
        } catch {
          /* ignore seek errors on some mobile browsers */
        }
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      };
      if (el.readyState >= 1) start();
      else el.addEventListener("loadedmetadata", start, { once: true });
    };

    const startBoth = () => {
      play(primaryRef.current, 0);
      play(secondaryRef.current, 1.3);
    };

    startBoth();

    // iOS/Safari may reject the initial autoplay attempt before a user
    // gesture. Retry on the first interaction so the video is already
    // playing when the vortex needs to become visible.
    const resumeOnGesture = () => {
      startBoth();
      if (primaryRef.current && !primaryRef.current.paused) {
        setIsPlaying(true);
      }
    };
    document.addEventListener("touchstart", resumeOnGesture, { passive: true, once: true });
    document.addEventListener("click", resumeOnGesture, { passive: true, once: true });

    // If autoplay already started before listeners attach, reflect that.
    if (primaryRef.current && !primaryRef.current.paused) {
      setIsPlaying(true);
    }

    return () => {
      document.removeEventListener("touchstart", resumeOnGesture);
      document.removeEventListener("click", resumeOnGesture);
    };
  }, []);

  const onPlaying = () => setIsPlaying(true);
  const targetOpacity = visible && isPlaying ? 1 : 0;

  const baseStyle: React.CSSProperties = {
    objectFit: "cover",
    borderRadius: "9999px",
    transform: "translate(-50%, -50%)",
    zIndex: 2,
    pointerEvents: "none",
  };

  return (
    <div
      aria-hidden
      data-rotation={rotation}
      className="portal-vortex-core absolute top-1/2 left-1/2 pointer-events-none w-[72%] h-[72%] sm:w-[85%] sm:h-[85%]"
      style={{
        transform: "translate(-50%, -50%)",
        borderRadius: "9999px",
        overflow: "hidden",
        zIndex: 2,
        // Dark base so a still-loading frame never reads as the old blue vortex.
        background: "hsl(220 60% 8% / 0.85)",
        // Subtle organic luminosity pulse (no flicker).
        animation: "portalVortexPulse 6.7s ease-in-out infinite",
      }}
    >
      {/* Primary flow — main forward current.
          The source video is already cropped to only the vortex; we
          zoom slightly (118%) so any residual ring pixels at the edge
          fall outside the circular mask, leaving only the fluid. */}
      <video
        ref={primaryRef}
        src={vortexVideo}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onPlaying={onPlaying}
        className="absolute top-1/2 left-1/2 select-none"
        style={{
          ...baseStyle,
          width: "118%",
          height: "118%",
          opacity: targetOpacity,
          transition: "opacity 0.35s ease",
          filter: "drop-shadow(0 0 30px hsl(200 100% 60% / 0.7))",
        }}
      />
      {/* Secondary flow — same video, offset in time, mirrored + screen
          blended. Adds swirling internal currents so the loop never
          reads as a repeating clip. Slower + reversed rotation drift. */}
      <video
        ref={secondaryRef}
        src={vortexVideo}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onPlaying={onPlaying}
        className="absolute top-1/2 left-1/2 select-none"
        style={{
          ...baseStyle,
          width: "132%",
          height: "132%",
          opacity: targetOpacity * 0.45,
          transition: "opacity 0.35s ease",
          mixBlendMode: "screen",
          filter:
            "drop-shadow(0 0 24px hsl(200 100% 65% / 0.5)) hue-rotate(-6deg) saturate(1.05)",
          animation: "portalVortexDrift 47s linear infinite",
          transformOrigin: "center center",
        }}
      />
      {/* Rim darkening — reinforces "flowing into center" without cropping
          the video's own detail. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 55%, hsl(220 60% 10% / 0.35) 100%)",
          borderRadius: "9999px",
          mixBlendMode: "multiply",
        }}
      />
    </div>
  );
}
