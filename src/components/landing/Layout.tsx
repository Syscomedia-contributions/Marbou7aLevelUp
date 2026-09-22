import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import MinimalFooter from "./MinimalFooter";
import BackToTop from "./BackToTop";
import mobileStargateVideo from "@/assets/generated/hero-stargate-mobile-v6.mp4";
import footerLandscape from "@/assets/footer-egypt-landscape.jpg";
import abydosContinuationDesktop from "@/assets/quiz-bg/abydos-continuation-desktop.jpg";
import abydosContinuationMobile from "@/assets/quiz-bg/abydos-continuation-mobile.jpg";
import scienceMissionDesktop from "@/assets/quiz-bg/mission-science-desktop.jpg";
import scienceMissionMobile from "@/assets/quiz-bg/mission-science-mobile.jpg";
import sportMissionDesktop from "@/assets/quiz-bg/mission-sport-desktop.jpg";
import sportMissionMobile from "@/assets/quiz-bg/mission-sport-mobile.jpg";
import historyMissionDesktop from "@/assets/quiz-bg/mission-history-desktop.jpg";
import historyMissionMobile from "@/assets/quiz-bg/mission-history-mobile.jpg";
import archeoMissionDesktop from "@/assets/quiz-bg/mission-archeo-desktop.jpg";
import archeoMissionMobile from "@/assets/quiz-bg/mission-archeo-mobile.jpg";
import entertainmentMissionDesktop from "@/assets/quiz-bg/mission-ent-desktop.jpg";
import entertainmentMissionMobile from "@/assets/quiz-bg/mission-ent-mobile.jpg";
import artMissionDesktop from "@/assets/quiz-bg/mission-art-desktop.jpg";
import artMissionMobile from "@/assets/quiz-bg/mission-art-mobile.jpg";

// Per-category "mission" backdrop (Lovable export) — rendered behind the quiz
// pages once QuizPlay.tsx switches to the Abydos-themed panel styling
// (Phase 3). Falls back to the shared Abydos-continuation landscape.
const MISSION_LANDSCAPES: Record<string, { desktop: string; mobile: string }> = {
  science: { desktop: scienceMissionDesktop, mobile: scienceMissionMobile },
  sport: { desktop: sportMissionDesktop, mobile: sportMissionMobile },
  history: { desktop: historyMissionDesktop, mobile: historyMissionMobile },
  archeo: { desktop: archeoMissionDesktop, mobile: archeoMissionMobile },
  ent: { desktop: entertainmentMissionDesktop, mobile: entertainmentMissionMobile },
  art: { desktop: artMissionDesktop, mobile: artMissionMobile },
};


const Layout = () => {
  const { pathname } = useLocation();
  const [isIframe] = useState(
    () => typeof window !== "undefined" && window.self !== window.top,
  );
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  // Mobile browsers can block or stall the very first autoplay attempt.
  // Keep retrying (load, canplay, visibility change, first gesture) so the
  // Stargate background always starts from the beginning and plays smoothly.
  useEffect(() => {
    const video = mobileVideoRef.current;
    if (!video) return;

    let cancelled = false;

    const start = () => {
      if (cancelled || !video) return;
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      if (video.currentTime > 0.05 && video.paused) {
        // resume where it stopped instead of restarting mid-experience
      } else if (video.readyState >= 1 && video.currentTime === 0) {
        try { video.currentTime = 0; } catch { /* ignore */ }
      }
      const playback = video.play();
      if (playback && typeof playback.catch === "function") playback.catch(() => {});
    };

    // Make sure metadata/frames are fetched, then attempt playback repeatedly
    // for a short window until the video is genuinely running.
    try { video.load(); } catch { /* ignore */ }
    start();

    const interval = window.setInterval(() => {
      if (cancelled) return;
      if (!video.paused && !video.ended && video.readyState >= 3) {
        window.clearInterval(interval);
        return;
      }
      start();
    }, 200);
    const stopRetry = window.setTimeout(() => window.clearInterval(interval), 8000);

    const onVisibility = () => { if (document.visibilityState === "visible") start(); };
    video.addEventListener("loadeddata", start);
    video.addEventListener("canplay", start);
    video.addEventListener("stalled", start);
    video.addEventListener("suspend", start);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("click", start);
    document.addEventListener("scroll", start, { passive: true });

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(stopRetry);
      video.removeEventListener("loadeddata", start);
      video.removeEventListener("canplay", start);
      video.removeEventListener("stalled", start);
      video.removeEventListener("suspend", start);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("touchstart", start);
      document.removeEventListener("click", start);
      document.removeEventListener("scroll", start);
    };
  }, [pathname]);


  const isHome = pathname === "/";
  // On the portal, the continuous background artwork hangs below the footer; clipping
  // the vertical overflow here keeps the document ending right at the signature so no
  // empty band of desert is left under it. (Matches Lovable's Layout.tsx exactly.)
  const isPortal = pathname === "/portal";
  // The only footer anywhere on the site is the minimal "By Syscomedia +
  // copyright" credit. It renders on every page (including /portal and
  // /quiz/*), matching Lovable's Layout.tsx which has no hideFooter logic at
  // all. Ranking is the sole exception: it renders the footer itself inside
  // PrizesPage.tsx (Ladder is shifted with a CSS transform that a plain
  // flow-sibling here can't follow) — excluded here to avoid a duplicate.
  const hideFooter = pathname === "/prizes";
  const quizCategory = pathname.match(/^\/quiz\/([^/]+)/)?.[1];
  const missionLandscape = quizCategory ? MISSION_LANDSCAPES[quizCategory] : undefined;
  const desktopLandscape = missionLandscape?.desktop ?? abydosContinuationDesktop;
  const mobileLandscape = missionLandscape?.mobile ?? abydosContinuationMobile;
  return (
    <main
      className={`relative min-h-screen min-h-[100dvh] [overflow-x:clip]${
        isPortal ? " [overflow-y:clip]" : ""
      }`}
    >
      {!isIframe && <Navbar />}
      {/* Quiz missions: shared Abydos landscape that scrolls with the page */}
      {quizCategory && (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-30 bg-cover bg-center bg-no-repeat hidden sm:block"
            style={{ backgroundImage: `url(${desktopLandscape})`, backgroundPosition: "center top" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-30 bg-cover bg-center bg-no-repeat sm:hidden"
            style={{ backgroundImage: `url(${mobileLandscape})`, backgroundPosition: "center top" }}
          />
        </>
      )}
      {isHome ? (
        <div className="relative">
          {/* Mobile only on the home page: animated Stargate video background */}
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-50 h-[100svh] min-h-[100svh] w-[100dvw] overflow-hidden supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:min-h-[100dvh] md:hidden [@media(max-width:950px)_and_(max-height:600px)_and_(orientation:landscape)]:!block" aria-hidden="true">
            <video
              ref={mobileVideoRef}
              data-hero-bg="mobile"
              src={mobileStargateVideo}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              disableRemotePlayback
              x-webkit-airplay="deny"
              controls={false}
              tabIndex={-1}
              className="absolute inset-0 h-full w-full select-none"
              style={{
                objectFit: "cover",
                objectPosition: "center 25%",
                transform: "scale(1.05) translateY(-5%)",
                backfaceVisibility: "hidden",
                willChange: "transform",
              }}
            />
          </div>

          <div className={isIframe ? "" : "pt-14"}>
            <Outlet />
          </div>
        </div>
      ) : (
        <div className={isIframe ? "" : "pt-14"}>
          <Outlet />
        </div>
      )}
      {!isIframe && !hideFooter && (
        isHome ? (
          // Blends the footer into the hero art above it (same treatment as
          // Lovable's Footer.tsx for the home route) instead of a hard cut
          // to the plain page background — the negative margin pulls the
          // background layer up under the end of the hero, and the equal
          // positive padding keeps the visible footer content in place.
          <div className="relative -mt-32 pt-32 sm:-mt-40 sm:pt-40 md:-mt-48 md:pt-48 overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-cover bg-bottom bg-no-repeat"
              style={{
                backgroundImage: `url(${footerLandscape})`,
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, hsl(0 0% 0% / 0.4) 18%, hsl(0 0% 0% / 0.88) 38%, hsl(0 0% 0%) 56%)",
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, hsl(0 0% 0% / 0.4) 18%, hsl(0 0% 0% / 0.88) 38%, hsl(0 0% 0%) 56%)",
              }}
            />
            <MinimalFooter />
          </div>
        ) : (
          <MinimalFooter />
        )
      )}
      {!isIframe && <BackToTop />}
    </main>
  );
};


export default Layout;
