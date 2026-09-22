import { useEffect, useRef } from "react";
import stargateVideo from "@/assets/generated/hero-stargate-v2.mp4";

/**
 * Animated Stargate provided by the user as a video clip.
 *
 * The clip is the animated version of the very same hero artwork, so it is
 * layered exactly on top of the existing hero background layers using the
 * identical `cover` / `background-position` math. No extra animation is
 * generated: the video *is* the Stargate animation.
 *
 * Layers: hero background (-z-20) → this video (-z-[19]) → all content.
 */

const VIDEO_LAYERS = [
  // Tablet — mirrors the `data-hero-bg="tablet"` layer (background-position: center)
  {
    key: "tablet",
    className: "hidden sm:block lg:hidden",
    objectPosition: "center",
  },
  // Desktop — mirrors the `data-hero-bg="desktop"` layer (background-position: 62% center)
  {
    key: "desktop",
    className: "hidden lg:block",
    objectPosition: "62% center",
  },
] as const;

const HeroStargateVideo = () => {
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

  // Autoplay is muted + inline, but Safari can still refuse the very first
  // attempt: retry on the first user gesture so the Stargate is always moving.
  useEffect(() => {
    const start = () => {
      refs.current.forEach((el) => {
        if (!el) return;
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      });
    };
    start();
    document.addEventListener("touchstart", start, { passive: true, once: true });
    document.addEventListener("click", start, { passive: true, once: true });
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("click", start);
    };
  }, []);

  return (
    <>
      {VIDEO_LAYERS.map((layer, i) => (
        <video
          key={layer.key}
          ref={(el) => {
            refs.current[i] = el;
          }}
          data-hero-stargate={layer.key}
          aria-hidden="true"
          src={stargateVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          controls={false}
          tabIndex={-1}
          className={`absolute inset-0 -z-[19] h-full w-full select-none pointer-events-none [@media(max-width:950px)_and_(max-height:600px)_and_(orientation:landscape)]:!hidden ${layer.className}`}
          style={{ objectFit: "cover", objectPosition: layer.objectPosition }}
        />
      ))}
    </>
  );
};

export default HeroStargateVideo;
