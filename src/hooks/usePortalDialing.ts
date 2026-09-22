import { useCallback, useEffect, useRef, useState } from "react";
import {
  playSymbolClickSound,
  playRingRotationSound,
  playChevronUnlockLockV6Sound,
  playRevealSound,
  playRevealAlarmSound,
  scheduleChevronLockV6SoundAtGesture,
  unlockPortalAudio,
} from "@/lib/portalSounds";
import {
  pickRandomLockSeq,
  nextForwardRotation,
  desiredRotationMod,
} from "@/helpers/portalHelpers";
import { CATEGORIES } from "@/constants/portalConstants";
import { QUIZ_CATEGORY_META as QUIZ_CATEGORIES } from "@/data/quiz/categoryMeta";
import type { Phase, Stage, RevealedCat } from "@/types/portal";

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

/**
 * Encapsulates the SG-1 dialing state machine:
 *  - ring rotation (ref-tracked for RAF)
 *  - per-tap dial + chevron lock (`dialAndLock`)
 *  - user tap orchestration incl. iOS-safe SFX scheduling (`handleTap`)
 *  - full portal reset
 *
 * Timer/RAF/scheduled-sound refs are owned here so `reset()` can cancel
 * every side-effect in one call.
 */
export function usePortalDialing() {
  const [selected, setSelected] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState<Stage>(0);
  const [revealed, setRevealed] = useState<RevealedCat | null>(null);
  const [rotation, setRotation] = useState(0);
  const [lockedChevrons, setLockedChevrons] = useState<number[]>([]);
  const [lockingChevron, setLockingChevron] = useState<number | null>(null);
  const [revealingChevron, setRevealingChevron] = useState<number | null>(null);
  const [lockedTargetGlyph, setLockedTargetGlyph] = useState<number | null>(null);
  const [lockSeq, setLockSeq] = useState<number[]>(() => pickRandomLockSeq());

  const rotationRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const scheduledLockCancelsRef = useRef<(() => void)[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const usedTargetGlyphsRef = useRef<number[]>([]);
  const rotationSoundStopRef = useRef<(() => void) | null>(null);

  const setRingRotation = useCallback((value: number) => {
    rotationRef.current = value;
    setRotation(value);
  }, []);

  const lockChevron = useCallback((idx: number, silent = false) => {
    setLockingChevron(idx);
    // playChevronLockSound() in the original = playChevronUnlockLockV6Sound(1.0).
    // Core memory rule: chevron unlock/lock SFX must fire on EVERY lock — never silent.
    if (!silent) playChevronUnlockLockV6Sound(1.0);
    timersRef.current.push(
      window.setTimeout(() => {
        setLockedChevrons((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
      }, 1000),
    );
    timersRef.current.push(
      window.setTimeout(() => {
        setLockingChevron((cur) => (cur === idx ? null : cur));
      }, 1500),
    );
  }, []);

  /** Per-selection dial: spin the ring so `glyphIdx` lands under `chevSlot`,
   *  then trigger the chevron unlock/lock animation. On the 3rd (final)
   *  selection, reveals the category afterwards. */
  const dialAndLock = useCallback(
    (glyphIdx: number, chevSlot: number, isFinal: boolean, silent = false) => {
      if (animationFrameRef.current !== null)
        window.cancelAnimationFrame(animationFrameRef.current);

      const FAST_END = 1570;
      const ROT_STOP = 3000;
      const LOCK_TIME = 3200;
      const REVEAL_TIME = LOCK_TIME + 1500;

      const startRotation = rotationRef.current;
      const finalRotation = nextForwardRotation(
        startRotation,
        desiredRotationMod(glyphIdx, chevSlot),
        2,
      );
      const totalDelta = finalRotation - startRotation;
      const slowDelta = Math.max(180, totalDelta * 0.3);
      const fastEndRotation = finalRotation - slowDelta;

      setLockedTargetGlyph(glyphIdx);
      usedTargetGlyphsRef.current = [...usedTargetGlyphsRef.current, glyphIdx];

      let firedLock = false;
      let firedReveal = false;
      const t0 = performance.now();
      const stopRotationSound = playRingRotationSound();
      rotationSoundStopRef.current = stopRotationSound;

      const tick = (now: number) => {
        const elapsed = now - t0;
        if (elapsed <= FAST_END) {
          const p = elapsed / FAST_END;
          setRingRotation(startRotation + (fastEndRotation - startRotation) * p);
        } else if (elapsed <= ROT_STOP) {
          const p = (elapsed - FAST_END) / (ROT_STOP - FAST_END);
          setRingRotation(
            fastEndRotation + (finalRotation - fastEndRotation) * easeOutCubic(p),
          );
        } else {
          setRingRotation(finalRotation);
        }

        if (!firedLock && elapsed >= LOCK_TIME) {
          firedLock = true;
          setRingRotation(finalRotation);
          stopRotationSound();
          rotationSoundStopRef.current = null;
          lockChevron(chevSlot, silent);
          if (!isFinal) {
            timersRef.current.push(
              window.setTimeout(() => setPhase("idle"), 1550),
            );
            animationFrameRef.current = null;
            return;
          }
          setStage(4);
        }

        if (isFinal && !firedReveal && elapsed >= REVEAL_TIME) {
          firedReveal = true;
          setStage(5);
          const realCat = QUIZ_CATEGORIES[glyphIdx % QUIZ_CATEGORIES.length];
          setRevealed({
            key: realCat.key,
            img: CATEGORIES[glyphIdx].img,
            glyphIndex: glyphIdx,
          });
          setPhase("revealed");
          animationFrameRef.current = null;
          return;
        }

        animationFrameRef.current = window.requestAnimationFrame(tick);
      };

      animationFrameRef.current = window.requestAnimationFrame(tick);
    },
    [lockChevron, setRingRotation],
  );

  /** User tapped glyph `i`. Handles iOS-safe SFX scheduling, tour teardown
   *  broadcast, and the 3-step selection → reveal flow. */
  const handleTap = useCallback(
    (i: number) => {
      if (phase !== "idle") return;
      if (selected.includes(i)) return;

      // Recover animation SFX after stopping tour narration on iOS
      // (see original PortalPage comment).
      const tourWasPlaying =
        (window as unknown as { __portalTourOpen?: boolean }).__portalTourOpen === true ||
        document.body.classList.contains("tour-glyphs-glow") ||
        document.body.classList.contains("tour-symbol-step");

      window.dispatchEvent(new CustomEvent("portal:close-tour"));
      window.dispatchEvent(new CustomEvent("portal:stop-alarm"));

      const seq = selected.length; // 0, 1 or 2
      const next = [...selected, i];
      setSelected(next);
      setPhase("opening");
      unlockPortalAudio();

      // SYNC-CRITICAL (iOS): schedule chevron lock SFX for its exact firing
      // time (LOCK_TIME = 3200ms) from inside THIS tap gesture, so Safari
      // treats it as gesture-authorized. `dialAndLock(..., silent=true)`
      // then skips its own delayed lock sound.
      const cancelScheduledLock = scheduleChevronLockV6SoundAtGesture(3200, 1.0);
      const releaseScheduledLock = window.setTimeout(() => {
        scheduledLockCancelsRef.current = scheduledLockCancelsRef.current.filter(
          (cancel) => cancel !== cancelScheduledLock,
        );
      }, 5200);
      timersRef.current.push(releaseScheduledLock);
      scheduledLockCancelsRef.current.push(cancelScheduledLock);

      const runAudioAndDial = () => {
        playSymbolClickSound(1.8);
        if (seq === 2) {
          setStage(1);
          playRevealAlarmSound(0.6);
          playRevealSound();
        }
        dialAndLock(i, lockSeq[seq], seq === 2, true);
      };

      if (tourWasPlaying) {
        const isMobile =
          typeof window !== "undefined" &&
          window.matchMedia("(max-width: 767px)").matches;
        const delay = isMobile ? 200 : 0;
        window.setTimeout(() => {
          unlockPortalAudio();
          runAudioAndDial();
        }, delay);
      } else {
        runAudioAndDial();
      }
    },
    [phase, selected, lockSeq, dialAndLock],
  );

  const reset = useCallback(() => {
    scheduledLockCancelsRef.current.forEach((cancel) => {
      try {
        cancel();
      } catch {
        /* noop */
      }
    });
    scheduledLockCancelsRef.current = [];
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (animationFrameRef.current !== null)
      window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    if (rotationSoundStopRef.current) {
      try { rotationSoundStopRef.current(); } catch { /* noop */ }
      rotationSoundStopRef.current = null;
    }
    usedTargetGlyphsRef.current = [];
    setSelected([]);
    setRevealed(null);
    setStage(0);
    setPhase("idle");
    setLockedChevrons([]);
    setLockingChevron(null);
    setRevealingChevron(null);
    setRingRotation(0);
    setLockedTargetGlyph(null);
    setLockSeq(pickRandomLockSeq());
  }, [setRingRotation]);

  // Stop any ongoing ring rotation sound immediately when the hook unmounts
  // (e.g. user leaves the Portal page).
  useEffect(() => () => {
    if (rotationSoundStopRef.current) {
      try { rotationSoundStopRef.current(); } catch { /* noop */ }
      rotationSoundStopRef.current = null;
    }
  }, []);

  return {
    // state
    selected,
    phase,
    stage,
    rotation,
    revealed,
    lockedChevrons,
    lockingChevron,
    revealingChevron,
    lockedTargetGlyph,
    lockSeq,
    // refs (exposed for higher-level orchestration, e.g. tour/auto-play)
    rotationRef,
    animationFrameRef,
    timersRef,
    scheduledLockCancelsRef,
    usedTargetGlyphsRef,
    // setters
    setSelected,
    setPhase,
    setStage,
    setRevealed,
    setLockedChevrons,
    setLockingChevron,
    setRevealingChevron,
    setLockedTargetGlyph,
    setLockSeq,
    setRingRotation,
    // actions
    handleTap,
    dialAndLock,
    lockChevron,
    reset,
  };
}
