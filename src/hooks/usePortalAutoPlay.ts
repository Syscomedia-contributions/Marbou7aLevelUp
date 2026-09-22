import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  unlockPortalAudio,
  playSymbolClickSound,
  playRevealSound,
  stopAllPortalSounds,
} from "@/lib/portalSounds";
import { GLYPH_POSITIONS } from "@/constants/portalConstants";
import type { Phase, Stage, RevealedCat } from "@/types/portal";

type Deps = {
  introDone: boolean;
  phase: Phase;
  selectedLength: number;
  tourOpen: boolean;
  isIframe: boolean;
  authed: boolean;
  revealed: RevealedCat | null;
  lockSeq: number[];
  setSelected: React.Dispatch<React.SetStateAction<number[]>>;
  setPhase: React.Dispatch<React.SetStateAction<Phase>>;
  setStage: React.Dispatch<React.SetStateAction<Stage>>;
  dialAndLock: (
    glyphIdx: number,
    chevSlot: number,
    isFinal: boolean,
    silent?: boolean,
  ) => void;
  timersRef: React.MutableRefObject<number[]>;
};

/**
 * If the user leaves the portal untouched for 30s, auto-select 3 random
 * glyphs one by one (reproducing the manual tap flow exactly), reveal a
 * category, then navigate to the quiz.
 */
export function usePortalAutoPlay({
  introDone,
  phase,
  selectedLength,
  tourOpen,
  isIframe,
  authed,
  revealed,
  lockSeq,
  setSelected,
  setPhase,
  setStage,
  dialAndLock,
  timersRef,
}: Deps) {
  const navigate = useNavigate();
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const isAutoPlayRef = useRef(false);
  isAutoPlayRef.current = isAutoPlay;

  // Idle → auto-select 3 symbols (STEP = 4800ms mirrors the manual flow).
  useEffect(() => {
    if (!introDone) return;
    if (phase !== "idle" || selectedLength !== 0) return;
    if (tourOpen) return;
    if (isIframe) return;
    // Guests get prompted to log in on their first tap instead of being
    // auto-played into a quiz they can't actually start.
    if (!authed) return;

    const idleTimer = window.setTimeout(() => {
      setIsAutoPlay(true);

      const pool = Array.from({ length: GLYPH_POSITIONS.length }, (_, i) => i);
      const picks: number[] = [];
      while (picks.length < 3 && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        picks.push(pool.splice(idx, 1)[0]);
      }

      // Full non-final cycle: dial (~3200ms) + chevron settle (~1550ms) ≈ 4800ms.
      const STEP = 4800;
      unlockPortalAudio();
      picks.forEach((glyphIdx, i) => {
        const timer = window.setTimeout(() => {
          unlockPortalAudio();
          setSelected((prev) =>
            prev.includes(glyphIdx) ? prev : [...prev, glyphIdx],
          );
          setPhase("opening");
          playSymbolClickSound(1.8);
          if (i === 2) {
            setStage(1);
            playRevealSound();
          }
          dialAndLock(glyphIdx, lockSeq[i], i === 2);
        }, i * STEP);
        timersRef.current.push(timer);
      });
    }, 30000);
    timersRef.current.push(idleTimer);

    return () => {
      window.clearTimeout(idleTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introDone, phase, selectedLength, tourOpen, isIframe, authed]);

  // Once revealed, auto-navigate to the quiz — only during auto-play.
  useEffect(() => {
    if (phase !== "revealed" || !revealed || !isAutoPlay) return;
    const autoEnter = window.setTimeout(() => {
      stopAllPortalSounds();
      navigate(`/quiz/${revealed.key}`);
    }, 2000);
    return () => window.clearTimeout(autoEnter);
  }, [phase, revealed, navigate, isAutoPlay]);

  return { isAutoPlay, setIsAutoPlay };
}
