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
 *
 * A single <video> element is used for both tablet and desktop (with the
 * `object-position` shift handled purely via CSS breakpoints) instead of two
 * separate elements pointing at the same source — two elements meant the
 * browser fetched and decoded the same multi-MB clip twice simultaneously,
 * which was the main cause of the animation stalling/crashing under load.
 */

const HeroStargateVideo = () => {
  const ref = useRef<HTMLVideoElement | null>(null);

  // Autoplay is muted + inline, but Safari can still refuse the very first
  // attempt: retry on the first user gesture so the Stargate is always moving.
  useEffect(() => {
    const start = () => {
      const el = ref.current;
      if (!el) return;
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
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
    <video
      ref={ref}
      data-hero-stargate="video"
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
      className="hidden sm:block absolute inset-0 -z-[19] h-full w-full select-none pointer-events-none object-cover object-center lg:object-[62%_center] [@media(max-width:950px)_and_(max-height:600px)_and_(orientation:landscape)]:!hidden"
    />
  );
};

export default HeroStargateVideo;
