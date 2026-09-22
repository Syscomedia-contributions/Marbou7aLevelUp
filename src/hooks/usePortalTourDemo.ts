import { useCallback, useEffect, useRef } from "react";
import { CATEGORIES, GLYPH_POSITIONS } from "@/constants/portalConstants";
import { QUIZ_CATEGORY_META as QUIZ_CATEGORIES } from "@/data/quiz/categoryMeta";
import {
  desiredRotationMod,
  nextForwardRotation,
} from "@/helpers/portalHelpers";
import type { Phase, Stage, RevealedCat } from "@/types/portal";

type Deps = {
  isIframe: boolean;
  phase: Phase;
  revealed: RevealedCat | null;
  lockSeq: number[];
  lockedTargetGlyph: number | null;
  rotationRef: React.MutableRefObject<number>;
  animationFrameRef: React.MutableRefObject<number | null>;
  timersRef: React.MutableRefObject<number[]>;
  usedTargetGlyphsRef: React.MutableRefObject<number[]>;
  setSelected: React.Dispatch<React.SetStateAction<number[]>>;
  setPhase: React.Dispatch<React.SetStateAction<Phase>>;
  setStage: React.Dispatch<React.SetStateAction<Stage>>;
  setRevealed: React.Dispatch<React.SetStateAction<RevealedCat | null>>;
  setLockedChevrons: React.Dispatch<React.SetStateAction<number[]>>;
  setLockingChevron: React.Dispatch<React.SetStateAction<number | null>>;
  setRevealingChevron: React.Dispatch<React.SetStateAction<number | null>>;
  setLockedTargetGlyph: React.Dispatch<React.SetStateAction<number | null>>;
  setRingRotation: (v: number) => void;
  lockChevron: (idx: number, silent?: boolean) => void;
  registerFreeze: (fn: () => void) => void;
  registerReset: (fn: () => void) => void;
};

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

export function usePortalTourDemo(deps: Deps) {
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const demoTimersRef = useRef<number[]>([]);
  const demoStopRotationRef = useRef<(() => void) | null>(null);

  const clearDemoTimers = () => {
    demoTimersRef.current.forEach((id) => window.clearTimeout(id));
    demoTimersRef.current = [];
  };

  const startContinuousDialDemo = useCallback((glyphs: number[]) => {
    const d = depsRef.current;
    if (d.animationFrameRef.current !== null)
      window.cancelAnimationFrame(d.animationFrameRef.current);

    const FAST_END = 2500;
    const ROT_STOP = 4000;
    const LOCK_TIME = 4250;
    const FLASH_TIME = LOCK_TIME + 1000;
    const REVEAL_TIME = LOCK_TIME + 1500;

    const startRotation = d.rotationRef.current;
    const lastTarget =
      d.usedTargetGlyphsRef.current[d.usedTargetGlyphsRef.current.length - 1];
    const pool = glyphs.filter((g) => g !== lastTarget);
    const choices = pool.length > 0 ? pool : glyphs;
    const targetGlyph = choices[Math.floor(Math.random() * choices.length)];
    d.usedTargetGlyphsRef.current = [
      ...d.usedTargetGlyphsRef.current,
      targetGlyph,
    ];
    d.setLockedTargetGlyph(targetGlyph);

    const finalRotation = nextForwardRotation(
      startRotation,
      desiredRotationMod(targetGlyph, d.lockSeq[2]),
      4,
    );
    const totalDelta = finalRotation - startRotation;
    const slowDelta = Math.max(180, totalDelta * 0.3);
    const fastEndRotation = finalRotation - slowDelta;

    let firedLock = false;
    let firedFlash = false;
    let firedReveal = false;
    const t0 = performance.now();
    const stopRotationSound = () => {};
    demoStopRotationRef.current = stopRotationSound;

    const tick = (now: number) => {
      const dd = depsRef.current;
      const elapsed = now - t0;
      if (elapsed <= FAST_END) {
        const p = elapsed / FAST_END;
        dd.setRingRotation(startRotation + (fastEndRotation - startRotation) * p);
      } else if (elapsed <= ROT_STOP) {
        const p = (elapsed - FAST_END) / (ROT_STOP - FAST_END);
        dd.setRingRotation(
          fastEndRotation + (finalRotation - fastEndRotation) * easeOutCubic(p),
        );
      } else {
        dd.setRingRotation(finalRotation);
      }
      if (!firedLock && elapsed >= LOCK_TIME) {
        firedLock = true;
        dd.setRingRotation(finalRotation);
        stopRotationSound();
        dd.setStage(3);
        dd.lockChevron(dd.lockSeq[2]);
      }
      if (!firedFlash && elapsed >= FLASH_TIME) {
        firedFlash = true;
        dd.setStage(4);
        window.dispatchEvent(new CustomEvent("portal:tour-demo-locked"));
      }
      if (!firedReveal && elapsed >= REVEAL_TIME) {
        firedReveal = true;
        dd.setStage(5);
        const realCat = QUIZ_CATEGORIES[targetGlyph % QUIZ_CATEGORIES.length];
        dd.setRevealed({
          key: realCat.key,
          img: CATEGORIES[targetGlyph].img,
          glyphIndex: targetGlyph,
        });
        dd.setPhase("revealed");
        dd.animationFrameRef.current = null;
        return;
      }
      dd.animationFrameRef.current = window.requestAnimationFrame(tick);
    };
    d.animationFrameRef.current = window.requestAnimationFrame(tick);
  }, []);

  const cancelDemoDial = useCallback(() => {
    const d = depsRef.current;
    if (d.isIframe) return;
    clearDemoTimers();
    d.timersRef.current.forEach((id) => window.clearTimeout(id));
    d.timersRef.current = [];
    if (d.animationFrameRef.current !== null) {
      window.cancelAnimationFrame(d.animationFrameRef.current);
      d.animationFrameRef.current = null;
    }
    if (demoStopRotationRef.current) {
      try {
        demoStopRotationRef.current();
      } catch {
        /* noop */
      }
      demoStopRotationRef.current = null;
    }
    d.setStage(0);
    d.setPhase("idle");
    d.setSelected([]);
    d.setLockedChevrons((prev) => prev.filter((c) => c !== d.lockSeq[2]));
    d.setLockingChevron(null);
    d.setRevealingChevron(null);
    d.setLockedTargetGlyph(null);
    d.setRevealed(null);
    window.dispatchEvent(new CustomEvent("portal:tour-demo-reset"));
  }, []);

  const freezeDemoReveal = useCallback(() => {
    const d = depsRef.current;
    clearDemoTimers();
    if (d.animationFrameRef.current !== null) {
      window.cancelAnimationFrame(d.animationFrameRef.current);
      d.animationFrameRef.current = null;
    }
    if (demoStopRotationRef.current) {
      try {
        demoStopRotationRef.current();
      } catch {
        /* noop */
      }
      demoStopRotationRef.current = null;
    }
    if (d.phase === "revealed" && d.revealed && d.lockedTargetGlyph !== null) {
      return;
    }
    const targetGlyph =
      d.lockedTargetGlyph !== null
        ? d.lockedTargetGlyph
        : Math.floor(Math.random() * GLYPH_POSITIONS.length);
    const finalRotation = nextForwardRotation(
      d.rotationRef.current,
      desiredRotationMod(targetGlyph, d.lockSeq[2]),
      0,
    );
    d.setRingRotation(finalRotation);
    d.setLockedTargetGlyph(targetGlyph);
    d.setLockedChevrons((prev) =>
      prev.includes(d.lockSeq[2]) ? prev : [...prev, d.lockSeq[2]],
    );
    d.setStage(5);
    const realCat = QUIZ_CATEGORIES[targetGlyph % QUIZ_CATEGORIES.length];
    d.setRevealed({
      key: realCat.key,
      img: CATEGORIES[targetGlyph].img,
      glyphIndex: targetGlyph,
    });
    d.setPhase("revealed");
  }, []);

  const runDemoDial = useCallback(() => {
    const d = depsRef.current;
    if (d.animationFrameRef.current !== null) {
      window.cancelAnimationFrame(d.animationFrameRef.current);
      d.animationFrameRef.current = null;
    }
    clearDemoTimers();
    if (demoStopRotationRef.current) {
      try {
        demoStopRotationRef.current();
      } catch {
        /* noop */
      }
      demoStopRotationRef.current = null;
    }
    d.setStage(0);
    d.setPhase("idle");
    d.setSelected([]);
    d.setLockedChevrons((prev) => prev.filter((c) => c !== d.lockSeq[2]));
    d.setLockedTargetGlyph(null);
    d.setRevealed(null);
    window.dispatchEvent(new CustomEvent("portal:tour-demo-reset"));

    const pool = Array.from({ length: GLYPH_POSITIONS.length }, (_, i) => i);
    const picks: number[] = [];
    while (picks.length < 3 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(idx, 1)[0]);
    }

    d.setSelected(picks);
    d.setPhase("opening");
    startContinuousDialDemo(picks);
  }, [startContinuousDialDemo]);

  useEffect(() => {
    deps.registerFreeze(freezeDemoReveal);
    deps.registerReset(cancelDemoDial);
  }, [deps, freezeDemoReveal, cancelDemoDial]);

  useEffect(() => {
    const onDemo = () => runDemoDial();
    const onCancel = () => cancelDemoDial();
    window.addEventListener("portal:tour-demo-dial", onDemo);
    window.addEventListener("portal:tour-demo-cancel", onCancel);
    return () => {
      window.removeEventListener("portal:tour-demo-dial", onDemo);
      window.removeEventListener("portal:tour-demo-cancel", onCancel);
    };
  }, [runDemoDial, cancelDemoDial]);
}
