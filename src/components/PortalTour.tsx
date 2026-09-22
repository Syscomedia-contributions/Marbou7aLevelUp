import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { HelpCircle, X, ArrowLeft, ArrowRight, MousePointerClick, Loader2, Trophy, Volume2, VolumeX, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import cursorHand from "@/assets/cursor-hand.png";
import frStep1 from "@/assets/audio/french_step_1.mp3";
import frStep2 from "@/assets/audio/french_step_2.mp3";
import frStep3 from "@/assets/audio/french_step_3.mp3";
import enStep1 from "@/assets/audio/english_step_1.mp3";
import enStep2 from "@/assets/audio/english_step_2.mp3";
import enStep3 from "@/assets/audio/english_step_3.mp3";
import arStep1 from "@/assets/audio/arabic_step_1.mp3";
import arStep2 from "@/assets/audio/arabic_step_2.mp3";
import arStep3 from "@/assets/audio/arabic_step_3.mp3";
import { unlockPortalAudio } from "@/lib/portalSounds";

const STEP_AUDIO: Record<string, string[]> = {
  fr: [frStep1, frStep2, frStep3],
  en: [enStep1, enStep2, enStep3],
  ar: [arStep1, arStep2, arStep3],
};

type Step = {
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
  /** CSS selector for the element to spotlight. Null = centered modal. */
  target: string | null;
  /** Extra padding (px) around the target in the cutout. */
  padding?: number;
  /** Preferred placement of the tooltip relative to target. */
  placement?: "top" | "bottom" | "auto";
  /** When true, the cycling hand cursor moves across all symbols. */
  cycleSymbols?: boolean;
};

const STEPS: Step[] = [
  {
    icon: <MousePointerClick className="w-6 h-6" />,
    titleKey: "portal.tour.s2.title",
    descKey: "portal.tour.s2.desc",
    target: "[data-tour='keyboard-glyph']",
    padding: 14,
    placement: "auto",
    cycleSymbols: true,
  },

  {
    icon: <Loader2 className="w-6 h-6" />,
    titleKey: "portal.tour.s4.title",
    descKey: "portal.tour.s4.desc",
    target: "[data-tour='chevron']",
    padding: 10,
    placement: "auto",
  },
  {
    icon: <Trophy className="w-6 h-6" />,
    titleKey: "portal.tour.s5.title",
    descKey: "portal.tour.s5.desc",
    target: "[data-tour='actions']",
    padding: 14,
    placement: "top",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

const PortalTour = () => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  // Audio-only mode: narration plays on page load without showing tour visuals.
  const [audioActive, setAudioActive] = useState(true);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [handRect, setHandRect] = useState<Rect | null>(null);
  const [firstSymbolRect, setFirstSymbolRect] = useState<Rect | null>(null);
  const [symbolIdx, setSymbolIdx] = useState(0);
  const [isIframe, setIsIframe] = useState(false);
  const showSymbolHand = STEPS[step]?.cycleSymbols === true;
  const isChevronStep = STEPS[step]?.target === "[data-tour='chevron']";
  const isActionsStep = STEPS[step]?.target === "[data-tour='actions']";
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const inIframe = window.self !== window.top;
    setIsIframe(inIframe);
    if (inIframe && typeof document !== "undefined") {
      document.documentElement.classList.add("scrollbar-hide");
      document.body.classList.add("scrollbar-hide");
    }
  }, []);


  // Reveal the mock action buttons on the portal page while the actions step
  // is active, even during the audio-only intro.
  useEffect(() => {
    if ((!open && !audioActive) || !isActionsStep) return;
    window.dispatchEvent(new CustomEvent("portal:tour-preview-actions-show"));
    // Desktop only: scroll down so the user can see the action buttons.
    const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches;
    if (isDesktop) {
      const scrollTid = window.setTimeout(() => {
        const el = document.querySelector<HTMLElement>("[data-tour='actions']");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 250);
      return () => {
        window.clearTimeout(scrollTid);
        window.dispatchEvent(new CustomEvent("portal:tour-preview-actions-hide"));
      };
    }
    return () => {
      window.dispatchEvent(new CustomEvent("portal:tour-preview-actions-hide"));
    };
  }, [open, audioActive, isActionsStep]);

  const initialLangRef = useRef<string | null>(null);

  // Device identifier — iOS Safari enforces the strictest autoplay policy:
  // audio can NEVER start without a real user gesture (synthetic events do
  // not count). We detect iOS so we can (a) pre-create the <audio> element
  // early and (b) attach an aggressive one-shot unlock on the widest set of
  // possible first interactions (touch/scroll/pointer/key/visibility).
  const isIOSRef = useRef(false);
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent || "";
    const iOS = /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports as Mac — disambiguate via touch points.
      (ua.includes("Mac") && typeof document !== "undefined" && "ontouchend" in document);
    isIOSRef.current = iOS;
  }, []);

  // Auto-start the guide as soon as the page loads (audio-only mode).
  // On mobile, browsers block audio until a user gesture — the play() call
  // inside the narration effect already handles that: if autoplay is refused,
  // it retries on the very first pointerdown/touchstart anywhere on the page.
  const didAutoStartRef = useRef(false);
  useEffect(() => {
    if (didAutoStartRef.current) return;
    didAutoStartRef.current = true;
    setStep(0);
    setAudioActive(true);
  }, []);

  // iOS-specific priming: pre-create the audio element with playsinline so
  // the narration effect can reuse it. We do NOT call play() here — doing so
  // muted-then-paused on the first user gesture was racing with the real
  // narration play() call and killing the audio. The existing retry listener
  // in the narration effect handles the actual unlock on first interaction.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isIOSRef.current) return;
    if (!audioRef.current) {
      const a = new Audio();
      a.preload = "auto";
      (a as any).playsInline = true;
      (a as any).setAttribute?.("playsinline", "");
      (a as any).setAttribute?.("webkit-playsinline", "");
      audioRef.current = a;
    }
  }, []);




  // Stop the tour (voiceover + animations) if the user starts interacting with the portal symbols.
  useEffect(() => {
    const stopTour = () => {
      // Pause + release the HTMLAudio narration SYNCHRONOUSLY, before the
      // portal SFX unlock the WebAudio context. On iOS, creating/resuming an
      // AudioContext while HTMLAudio is still playing puts the audio session
      // into a mode that silences the chevron lock SFX. We can't wait for the
      // React re-render triggered by setOpen(false) — it happens too late.
      try {
        const a = audioRef.current;
        if (a) {
          a.pause();
          try { a.removeAttribute("src"); a.load(); } catch { /* noop */ }
        }
        ttsAbortRef.current?.abort();
      } catch { /* noop */ }
      setOpen(false);
      setAudioActive(false);
      setStep(0);
      releasePageScrollSoon();
    };
    window.addEventListener("portal:close-tour", stopTour);
    return () => window.removeEventListener("portal:close-tour", stopTour);
  }, []);

  // Re-open the tour automatically whenever the user switches language.
  // Skip the very first language event (fired on mount) so we don't double-trigger.
  useEffect(() => {
    const handler = (lng: string) => {
      if (initialLangRef.current === null) {
        initialLangRef.current = lng;
        return;
      }
      if (lng === initialLangRef.current) return;
      initialLangRef.current = lng;
      // Language changed — restart the narration from the first step in the
      // newly selected language (audio-only mode, same as initial page load).
      try {
        const a = audioRef.current;
        if (a) {
          a.pause();
          try { a.removeAttribute("src"); a.load(); } catch { /* noop */ }
        }
        ttsAbortRef.current?.abort();
      } catch { /* noop */ }
      ttsCacheRef.current.clear();
      setStep(0);
      setAudioActive(true);
    };
    initialLangRef.current = i18n.language;
    i18n.on("languageChanged", handler);
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, [i18n]);

  const releasePageScroll = () => {
    if (typeof document === "undefined") return;
    const { body, documentElement } = document;
    // Only clear the scroll-lock class here. The visual classes
    // (`tour-glyphs-glow`, `tour-symbol-step`) are managed by their own
    // effects — removing them here would strip the symbol highlight during
    // the audio-only intro (when `open` is false but `audioActive` is true).
    body.classList.remove("tour-open");
    body.removeAttribute("data-scroll-locked");
    documentElement.removeAttribute("data-scroll-locked");
    body.style.overflow = "";
    body.style.overflowY = "";
    body.style.overscrollBehaviorY = "";
    body.style.position = "";
    body.style.top = "";
    body.style.width = "";
    body.style.height = "";
    body.style.touchAction = "";
    body.style.pointerEvents = "";
    body.style.paddingRight = "";
    body.style.marginRight = "";
    body.style.removeProperty("--removed-body-scroll-bar-size");
    documentElement.style.overflow = "";
    documentElement.style.overflowY = "";
    documentElement.style.overscrollBehaviorY = "";
    documentElement.style.position = "";
    documentElement.style.height = "";
    documentElement.style.touchAction = "";
    documentElement.style.pointerEvents = "";
    documentElement.style.removeProperty("--removed-body-scroll-bar-size");
  };

  const releasePageScrollSoon = () => {
    if (typeof window === "undefined") return releasePageScroll();
    releasePageScroll();
    window.requestAnimationFrame(releasePageScroll);
    window.setTimeout(releasePageScroll, 50);
    window.setTimeout(releasePageScroll, 250);
  };

  // Broadcast open/close so the rest of the page can pause auto-actions
  // while the tour is visible.
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__portalTourOpen = open;
    window.dispatchEvent(new CustomEvent(open ? "portal:tour-open" : "portal:tour-close"));
    if (typeof document !== "undefined") {
      document.body.classList.toggle("tour-open", open);
      if (!open) releasePageScrollSoon();
    }
  }, [open]);

  useEffect(() => {
    return () => releasePageScrollSoon();
  }, []);


  // Read the current step aloud in the active language whenever it changes.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  // True when the browser refused autoplay (iOS Safari and others). Surfaces
  // a small floating hint inviting the user to tap once to enable narration.
  const [needsSoundTap, setNeedsSoundTap] = useState(false);
  // Cache of preloaded audio object-URLs keyed by `${lang}:${stepIndex}` so we
  // can play each step instantly without waiting for the network round-trip.
  const ttsCacheRef = useRef<Map<string, Promise<string>>>(new Map());

  const fetchStepAudio = (idx: number, lang: string): Promise<string> | null => {
    const cur = STEPS[idx];
    if (!cur) return null;
    const bucket = STEP_AUDIO[lang] ?? STEP_AUDIO.fr;
    const url = bucket?.[idx];
    if (!url) return null;
    return Promise.resolve(url);
  };

  // Preload ALL step narrations as soon as the tour opens (or language changes)
  // so step transitions can play audio immediately.
  useEffect(() => {
    if (!open && !audioActive) return;
    const lang = (i18n.language || "fr").slice(0, 2);
    STEPS.forEach((_, i) => { fetchStepAudio(i, lang)?.catch(() => {}); });
     
  }, [open, audioActive, i18n.language]);

  useEffect(() => {
    if (!open && !audioActive) {
      audioRef.current?.pause();
      // Keep the element around so it stays "unlocked" for iOS; just clear src.
      ttsAbortRef.current?.abort();
      return;
    }
    if (!audioEnabled) return;
    const lang = (i18n.language || "fr").slice(0, 2);

    audioRef.current?.pause();
    ttsAbortRef.current?.abort();
    const ctrl = new AbortController();
    ttsAbortRef.current = ctrl;

    // Prefetch the next step too so it's ready before the user advances.
    if (step + 1 < STEPS.length) fetchStepAudio(step + 1, lang)?.catch(() => {});

    const promise = fetchStepAudio(step, lang);
    if (!promise) return;

    (async () => {
      try {
        const url = await promise;
        if (ctrl.signal.aborted) return;
        // Reuse a single Audio element across all steps. On iOS Safari, once
        // an element has been unlocked by a user gesture, subsequent calls to
        // `play()` on the SAME element are allowed even after a setTimeout
        // gap (which is what breaks step 2 → 3 on mobile).
        let audio = audioRef.current;
        if (!audio) {
          audio = new Audio();
          audio.preload = "auto";
          audioRef.current = audio;
        }
        audio.src = url;
        // Arabic narration sounds slow at 1x — keep it brisk so it matches the
        // energy of the FR/EN takes. Step 3 (last step) is slightly faster so
        // it feels snappier before the tour ends.
        audio.playbackRate = lang === "ar" ? (step === 2 ? 1.5 : 1.35) : (step === 2 ? 1.15 : 1);
        audio.preservesPitch = true;
        // Fallback: if narration fails to load/decode, auto-advance so the
        // tour never freezes on a broken audio asset.
        const advanceStep = () => {
          if (ctrl.signal.aborted) return;
          const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
          const extraDelay = STEPS[step]?.target === "[data-tour='chevron']" ? (isMobile ? 500 : 250) : 0;
          window.setTimeout(() => {
            if (ctrl.signal.aborted) return;
            if (step < STEPS.length - 1) {
              setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
            } else {
              // In the popup iframe, keep the guide pinned on the final step
              // so the portal stays revealed instead of resetting to 0/3.
              if (isIframe) {
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  window.parent.postMessage("portal-tour-finished", window.location.origin);
                }
                return;
              }
              setOpen(false);
              setAudioActive(false);
              if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }
          }, extraDelay);
        };
        const onError = () => { if (!open) advanceStep(); };
        const onEnded = () => advanceStep();
        audio.addEventListener("error", onError, { once: true });
        audio.addEventListener("ended", onEnded, { once: true });
        ctrl.signal.addEventListener("abort", () => {
          audio!.removeEventListener("error", onError);
          audio!.removeEventListener("ended", onEnded);
        });
        try {
          await audio.play();
          setNeedsSoundTap(false);
        } catch {
          // Autoplay blocked — surface a discreet "tap to enable sound" hint
          // and retry on the next user gesture anywhere on the page.
          setNeedsSoundTap(true);
          const retry = () => {
            window.removeEventListener("pointerdown", retry, true);
            window.removeEventListener("keydown", retry, true);
            window.removeEventListener("touchstart", retry, true);
            if (ctrl.signal.aborted) return;
            // Same reason as in reopen(): keep WebAudio unlocked alongside narration.
            unlockPortalAudio();
            audio!.play().then(() => setNeedsSoundTap(false)).catch(() => {});
          };
          window.addEventListener("pointerdown", retry, true);
          window.addEventListener("keydown", retry, true);
          window.addEventListener("touchstart", retry, true);
          ctrl.signal.addEventListener("abort", () => {
            window.removeEventListener("pointerdown", retry, true);
            window.removeEventListener("keydown", retry, true);
            window.removeEventListener("touchstart", retry, true);
          });
        }
      } catch {
        /* swallow — guide stays usable without audio */
      }
    })();

    return () => {
      ctrl.abort();
      audioRef.current?.pause();
    };
  }, [open, audioActive, step, i18n.language, t, audioEnabled]);



  // Add a body class while the tour is open or playing audio-only so we can
  // make the ring glyphs illuminate in sync with the spotlight pulse.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const cls = "tour-glyphs-glow";
    if ((open || audioActive) && showSymbolHand) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [open, audioActive, showSymbolHand]);


  // Hide the static page click-hint while the cycling hand or chevron demo
  // is active, even in audio-only mode.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const cls = "tour-symbol-step";
    const isFinalStep = step === STEPS.length - 1;
    if ((open || audioActive) && (showSymbolHand || isChevronStep || isFinalStep)) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [open, audioActive, showSymbolHand, isChevronStep, step]);

  // Broadcast when the chevron step (step 1) starts/ends so the portal page
  // can dim the two non-locked selected glyphs and only highlight the one
  // sitting under the chevron.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((open || audioActive) && isChevronStep) {
      window.dispatchEvent(new CustomEvent("portal:tour-chevron-step-start"));
    } else {
      window.dispatchEvent(new CustomEvent("portal:tour-chevron-step-end"));
    }
  }, [open, audioActive, isChevronStep]);

  // Broadcast when the actions step (step 3) starts/ends so the portal page
  // can hide the persistent chevron light effect on mobile.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((open || audioActive) && isActionsStep) {
      window.dispatchEvent(new CustomEvent("portal:tour-actions-step-start"));
    } else {
      window.dispatchEvent(new CustomEvent("portal:tour-actions-step-end"));
    }
  }, [open, audioActive, isActionsStep]);

  // While the chevron step is active, replay the full automatic dialing
  // sequence (ring spin → ease-out → chevron lock with sound + flash) so
  // the user sees exactly what happens during a real reveal.
  useEffect(() => {
    if ((!open && !audioActive) || !isChevronStep) return;
    const fire = () => window.dispatchEvent(new CustomEvent("portal:tour-demo-dial"));
    const first = window.setTimeout(fire, 350);

    return () => {
      window.clearTimeout(first);
      const enteringActionsStep = STEPS[stepRef.current]?.target === "[data-tour='actions']";
      if (!enteringActionsStep) {
        window.dispatchEvent(new CustomEvent("portal:tour-demo-cancel"));
      }
    };

  }, [open, audioActive, isChevronStep]);




  // Return all keyboard glyphs in DOM order so the hand demonstrates the
  // intended input controls instead of pointing at the Stargate ring.
  const getVisibleSymbols = () => {
    return Array.from(
      document.querySelectorAll<HTMLElement>("[data-tour='keyboard-glyph']")
    );
  };


  // Reset the symbol index when the tour first opens or when the audio-only
  // intro starts, so the hand begins from a known position.
  useEffect(() => {
    if (open || audioActive) setSymbolIdx(0);
  }, [open, audioActive]);

  // Cycle through symbols continuously (looping) while a hand-cycling step
  // is active, so transitioning step 1 → step 2 keeps the motion fluid.
  useEffect(() => {
    if ((!open && !audioActive) || !showSymbolHand) return;
    const id = window.setInterval(() => {
      const visible = getVisibleSymbols();
      if (visible.length === 0) return;
      setSymbolIdx((i) => (i + 1) % visible.length);
    }, 700);
    return () => window.clearInterval(id);
  }, [open, audioActive, showSymbolHand, step]);


  // Track the current symbol element rect so the hand can ride across
  // glyphs even when the spotlight is on a different element (e.g. counter).
  useLayoutEffect(() => {
    if ((!open && !audioActive) || !showSymbolHand) {
      setHandRect(null);
      return;
    }
    const compute = () => {
      const visible = getVisibleSymbols();
      const el = visible[symbolIdx % Math.max(1, visible.length)] ?? visible[0] ?? null;
      if (!el) {
        setHandRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setHandRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    const retry = window.setInterval(compute, 250);
    const stop = window.setTimeout(() => window.clearInterval(retry), 2000);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
      window.clearInterval(retry);
      window.clearTimeout(stop);
    };
  }, [open, audioActive, showSymbolHand, symbolIdx]);


  // Track the locked glyph's rect in both full tour and audio-only modes.
  const [lockActive, setLockActive] = useState(false);
  useEffect(() => {
    if ((!open && !audioActive) || !isChevronStep) {
      setLockActive(false);
      return;
    }
    const onLocked = () => setLockActive(true);
    const onReset = () => setLockActive(false);
    window.addEventListener("portal:tour-demo-locked", onLocked);
    window.addEventListener("portal:tour-demo-reset", onReset);
    return () => {
      window.removeEventListener("portal:tour-demo-locked", onLocked);
      window.removeEventListener("portal:tour-demo-reset", onReset);
    };
  }, [open, audioActive, isChevronStep]);

  useLayoutEffect(() => {
    if ((!open && !audioActive) || !isChevronStep || !lockActive) {
      setFirstSymbolRect(null);
      return;
    }
    const compute = () => {
      const el =
        document.querySelector<HTMLElement>("[data-tour-locked='true']") ??
        document.querySelector<HTMLElement>("[data-tour='symbol']");
      if (!el) {
        setFirstSymbolRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setFirstSymbolRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    const retry = window.setInterval(compute, 100);
    const stop = window.setTimeout(() => window.clearInterval(retry), 2000);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
      window.clearInterval(retry);
      window.clearTimeout(stop);
    };
  }, [open, audioActive, isChevronStep, lockActive]);

  // Recompute the spotlight rect for the current step in full tour and
  // audio-only modes so the animations stay visible even without the tooltip.
  useLayoutEffect(() => {
    if (!open && !audioActive) {
      setRect(null);
      return;
    }
    const cur = STEPS[step];
    if (!cur.target) {
      setRect(null);
      return;
    }
    const compute = () => {
      let el: HTMLElement | null;
      if (cur.target === "[data-tour='keyboard-glyph']") {
        const visible = getVisibleSymbols();
        el = visible[symbolIdx % Math.max(1, visible.length)] ?? visible[0] ?? null;
      } else {
        el = document.querySelector(cur.target!) as HTMLElement | null;
      }
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const pad = cur.padding ?? 8;
      setRect({
        top: r.top - pad,
        left: r.left - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
      });
    };
    compute();
    const ro = new ResizeObserver(compute);
    const el = document.querySelector(cur.target) as HTMLElement | null;
    if (el) ro.observe(el);
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    // Element may not exist yet on mount — retry briefly
    const retry = window.setInterval(compute, 250);
    const stop = window.setTimeout(() => window.clearInterval(retry), 2000);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
      window.clearInterval(retry);
      window.clearTimeout(stop);
    };
  }, [open, audioActive, step, symbolIdx]);

  const close = () => {
    const wasLast = step === STEPS.length - 1;
    setOpen(false);
    setAudioActive(false);
    setStep(0);
    releasePageScrollSoon();
    if (wasLast && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };


  const reopen = () => {
    // Unlock the WebAudio context inside this user gesture so portal SFX
    // (chevron lock, ring rotation) coexist with the HTMLAudio narration.
    // Without this, iOS suppresses the first SFX played after the guide.
    unlockPortalAudio();
    setStep(0);
    setAudioActive(true);
    setOpen(true);
  };

  const isLast = step === STEPS.length - 1;
  const cur = STEPS[step];

  // Compute tooltip position — on wide screens, dock the card to the right
  // side next to the Stargate; on narrow screens, keep adaptive placement.
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const isWide = vw >= 900;
  const TIP_W = isWide ? Math.min(340, vw - 24) : Math.min(360, vw - 24);
  const TIP_H_EST = 220;
  let tipStyle: React.CSSProperties;
  if (isWide) {
    // Dock to the right edge, vertically centered
    tipStyle = {
      width: TIP_W,
      right: Math.max(24, vw * 0.08),
      left: "auto",
      top: Math.max(12, (vh - TIP_H_EST) / 2),
    };
  } else {
    // Dock the tooltip at the bottom of the viewport on mobile so it stays
    // anchored under the stage instead of floating in the middle.
    tipStyle = {
      width: TIP_W,
      left: Math.max(12, (vw - TIP_W) / 2),
      bottom: isActionsStep ? Math.round(vh * 0.28) : 16,
      top: "auto",
    };
  }

  return (
    <>
      {/* Discreet floating hint shown ONLY when the browser blocked autoplay
          (iOS Safari and other strict autoplay policies). Disappears on the
          first tap since the global unlock listener resumes the narration. */}
      {needsSoundTap && (open || audioActive) && (
        <button
          type="button"
          onClick={() => {
            unlockPortalAudio();
            audioRef.current?.play().then(() => setNeedsSoundTap(false)).catch(() => {});
          }}
          aria-label={t("portal.tour.enableSound", "Touchez pour activer le son")}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] inline-flex items-center gap-2 rounded-full bg-primary/95 backdrop-blur px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg border border-primary/40 animate-pulse"
        >
          <Volume2 className="w-4 h-4" />
          <span>{t("portal.tour.enableSound", "Touchez pour activer le son")}</span>
        </button>
      )}

      {/* Help button — visible whenever the tour is closed. Hidden inside the
          Home-page popup iframe so the guide stays self-contained. */}
      {!open && !isIframe && (
        <button
          type="button"
          onClick={reopen}
          aria-label={t("portal.tour.help", "Guide")}
          className="portal-tour-help-btn fixed top-[6.4rem] sm:top-[8.9rem] right-4 sm:right-[10%] z-[60] inline-flex items-center gap-2 rounded-full bg-card/85 backdrop-blur border border-border p-2.5 sm:px-4 sm:py-2.5 text-sm sm:text-sm font-bold text-foreground shadow-soft hover:bg-card transition"
        >
          <HelpCircle className="w-6 h-6 sm:w-5 sm:h-5 text-primary" />
          <span className="hidden sm:inline">{t("portal.tour.help", "Guide")}</span>
        </button>
      )}

      {/* Visual tour layer: animations run both in full tour mode and in the
          audio-only intro so the 3 steps stay apparent even when the guide
          tooltip is not open. */}
      {(open || audioActive) && (
        <div
          className="fixed inset-0 z-[80] pointer-events-none"
          role={open ? "dialog" : undefined}
          aria-modal={open ? "false" : undefined}
          aria-label={open ? t("portal.tour.title", "Portal guide") : undefined}
        >
          {/* Spotlight overlay — uses 4 dark rectangles around the target so the
              highlighted element stays interactive-looking and crisp. */}
          {rect ? (
            <>
              {/* top */}
              <div
                className="absolute bg-transparent pointer-events-none"
                style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }}
              />
              {/* bottom */}
              <div
                className="absolute bg-transparent pointer-events-none"
                style={{ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }}
              />
              {/* left */}
              <div
                className="absolute bg-transparent pointer-events-none"
                style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }}
              />
              {/* right */}
              <div
                className="absolute bg-transparent pointer-events-none"
                style={{
                  top: rect.top,
                  left: rect.left + rect.width,
                  right: 0,
                  height: rect.height,
                }}
              />
              {/* highlight ring — hidden on the symbol step (only hand cursor stays)
                  and on the chevron step so the animated lock itself remains the focus. */}
              {isActionsStep && (
                <div
                  aria-hidden
                  className="absolute pointer-events-none rounded-2xl ring-2 ring-primary"
                  style={{
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    animation: `${isActionsStep ? "tour-glow-outline" : "tour-glow"} 1.4s ease-in-out infinite`,
                    transition:
                      "top 600ms cubic-bezier(0.22,1,0.36,1), left 600ms cubic-bezier(0.22,1,0.36,1), width 600ms cubic-bezier(0.22,1,0.36,1), height 600ms cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
              )}

            </>
          ) : null}

          {/* Moving hand cursor that cycles through the keyboard glyphs.
              Rendered independently of the spotlight rect so it can keep
              riding the glyphs even when the highlight is on the counter. */}
          {showSymbolHand && handRect && (
            <div
              aria-hidden
              data-tour="keyboard-hand"
              className="absolute pointer-events-none flex flex-col items-center"
              style={{
                top: handRect.top + handRect.height / 2,
                left: handRect.left + handRect.width / 2,
                transform: "translate(-50%, -50%)",
                transition: "top 600ms cubic-bezier(0.22,1,0.36,1), left 600ms cubic-bezier(0.22,1,0.36,1)",
                zIndex: 5,
              }}
            >
              <img
                src={cursorHand}
                alt=""
                className="h-12 w-12 md:h-14 md:w-14 drop-shadow-[0_0_6px_rgba(0,0,0,0.7)]"
              />
            </div>
          )}

          {/* Blue circular highlight on the glyph directly under the top
              chevron — shown during the chevron step in both modes. */}
          {isChevronStep && firstSymbolRect && (
            <div
              aria-hidden
              className="absolute pointer-events-none rounded-full"
              style={{
                top: firstSymbolRect.top - 8,
                left: firstSymbolRect.left - 8,
                width: firstSymbolRect.width + 16,
                height: firstSymbolRect.height + 16,
                boxShadow:
                  "0 0 0 3px hsl(217 90% 60% / 0.9), 0 0 22px 6px hsl(217 90% 60% / 0.7), inset 0 0 18px hsl(217 90% 75% / 0.55)",
                animation: "tour-glow 1.4s ease-in-out infinite",
                zIndex: 4,
              }}
            />
          )}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[80] pointer-events-none"
          role="dialog"
          aria-modal="false"
          aria-label={t("portal.tour.title", "Portal guide")}
        >
          {!rect && (
            <button
              type="button"
              aria-label={t("portal.tour.skip", "Skip")}
              onClick={close}
              className="absolute inset-0 bg-transparent pointer-events-none"
            />
          )}

          {/* Tooltip card */}
          <div
            className="absolute pointer-events-auto rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-xl p-5 text-foreground animate-in fade-in zoom-in-95 duration-200"
            style={tipStyle}
          >

            <button
              type="button"
              onClick={close}
              aria-label={t("portal.tour.skip", "Skip")}
              className="absolute top-3 right-3 inline-flex items-center justify-center rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (audioEnabled) {
                  audioRef.current?.pause();
                  audioRef.current = null;
                  ttsAbortRef.current?.abort();
                  setAudioEnabled(false);
                } else {
                  setAudioEnabled(true);
                }
              }}
              aria-label={audioEnabled ? "Couper la voix" : "Écouter la voix"}
              aria-pressed={audioEnabled}
              className={`absolute top-3 right-12 rtl:right-auto rtl:left-12 inline-flex items-center justify-center rounded-full p-1.5 transition ${
                audioEnabled
                  ? "text-primary bg-primary/15 hover:bg-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {step === 2 && (
              <button
                type="button"
                onClick={() => {
                  unlockPortalAudio();
                  setStep(0);
                }}
                aria-label={t("portal.tour.replay", "Réécouter le guide")}
                className="absolute top-3 left-3 rtl:left-auto rtl:right-3 inline-flex items-center justify-center rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}


            <div className="hidden sm:flex items-center gap-3 mb-3 pr-7 rtl:pr-7 rtl:pl-0">
              <div className="text-sm sm:text-base font-black uppercase tracking-[0.25em]">
                <span className="text-white">{step + 1}</span>
                <span className="text-white"> / </span>
                <span className="text-primary">{STEPS.length}</span>
              </div>
            </div>



            <div className="flex items-baseline gap-2 flex-wrap mb-2 pr-6">
              <span className="sm:hidden text-sm font-black uppercase tracking-[0.25em] whitespace-nowrap">
                <span className="text-white">{step + 1}</span>
                <span className="text-white"> / </span>
                <span className="text-primary">{STEPS.length}</span>
              </span>
              <h2 className="text-lg font-extrabold leading-tight">
                {t(cur.titleKey)}
              </h2>
            </div>
            <p className="text-sm max-sm:text-base text-foreground font-medium leading-relaxed">
              {t(cur.descKey)}
            </p>

            <div className="flex items-center justify-center gap-1.5 mt-4 max-sm:mt-2">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-2.5 rounded-full transition-all ${
                    i === step ? "w-8 bg-primary" : "w-2.5 bg-white"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 mt-4 max-sm:mt-2 max-sm:flex-row-reverse max-sm:justify-center max-sm:gap-3">
              <Button variant="ghost" size="sm" onClick={close} className="text-white hover:text-white max-sm:h-11 max-sm:px-4 max-sm:text-base max-sm:flex-1 max-sm:basis-0">
                {t("portal.tour.skip", "Skip")}
              </Button>
              <div className="grid grid-cols-2 gap-2 w-full max-sm:contents">
                {step > 0 && (
                  <Button variant="outline" size="sm" onClick={() => { if (isLast && typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); setStep((s) => s - 1); }} className="max-sm:h-11 max-sm:px-4 max-sm:text-base max-sm:flex-1 max-sm:basis-0 w-full">
                    <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                    {t("portal.tour.prev", "Back")}
                  </Button>

                )}
                {isLast ? (
                  <Button variant="hero" size="sm" onClick={close} className="max-sm:h-11 max-sm:px-4 max-sm:text-base max-sm:flex-1 max-sm:basis-0 w-full">
                    {t("portal.tour.done", "Got it")}
                  </Button>
                ) : (
                  <Button variant="hero" size="sm" onClick={(e) => { e.currentTarget.blur(); setStep((s) => s + 1); }} className="max-sm:h-11 max-sm:px-4 max-sm:text-base max-sm:flex-1 max-sm:basis-0 focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:outline-none w-full">
                    {t("portal.tour.next", "Next")}
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default PortalTour;
