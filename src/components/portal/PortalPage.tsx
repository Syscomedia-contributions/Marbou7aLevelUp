import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PortalTour from "@/components/PortalTour";
import LoginDialog from "@/components/landing/LoginDialog";
import { usePortalDialing } from "@/hooks/usePortalDialing";
import { usePortalAutoPlay } from "@/hooks/usePortalAutoPlay";
import { usePortalTour } from "@/hooks/usePortalTour";
import { usePortalTourDemo } from "@/hooks/usePortalTourDemo";
import { usePortalAudio } from "@/hooks/usePortalAudio";
import { PortalScene, PortalControls } from "./";
import { stopAllPortalSounds, setPortalSfxMuted } from "@/lib/portalSounds";
import { AUTH_CHANGE_EVENT, isAuthed } from "@/lib/auth";

export default function PortalPage() {
  const { i18n } = useTranslation();
  const [introDone, setIntroDone] = useState(false);
  const [isIframe] = useState(
    () => typeof window !== "undefined" && window.self !== window.top,
  );
  const [isGuideMode] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("guide") === "1",
  );
  const mutePortalSfx = isIframe || isGuideMode;
  const [authed, setAuthed] = useState<boolean>(() => isAuthed());
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const sync = () => setAuthed(isAuthed());
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // ---- Dialing state ----
  const dialing = usePortalDialing();

  // ---- Tour state ----
  const tour = usePortalTour();

  // ---- Audio ----
  usePortalAudio(mutePortalSfx, dialing.scheduledLockCancelsRef);

  // Inside the "Comment jouer" iframe guide, mute every portal SFX so only the
  // tour narration (PortalTour's own HTMLAudio) is heard.
  useEffect(() => {
    if (!mutePortalSfx) return;
    stopAllPortalSounds();
    window.dispatchEvent(new CustomEvent("portal:stop-alarm"));
    setPortalSfxMuted(true);
    return () => setPortalSfxMuted(false);
  }, [mutePortalSfx]);

  // ---- Auto-play ----
  usePortalAutoPlay({
    introDone,
    phase: dialing.phase,
    selectedLength: dialing.selected.length,
    tourOpen: tour.tourOpen,
    isIframe,
    authed,
    revealed: dialing.revealed,
    lockSeq: dialing.lockSeq,
    setSelected: dialing.setSelected,
    setPhase: dialing.setPhase,
    setStage: dialing.setStage,
    dialAndLock: dialing.dialAndLock,
    timersRef: dialing.timersRef,
  });

  // ---- Intro timer ----
  useEffect(() => {
    const id = window.setTimeout(() => setIntroDone(true), 1600);
    return () => window.clearTimeout(id);
  }, []);

  // ---- Language change resets ----
  useEffect(() => {
    const handler = () => dialing.reset();
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, [i18n, dialing.reset]);

  // ---- Tour demo dial (wires portal:tour-demo-* events + freeze/reset) ----
  usePortalTourDemo({
    isIframe,
    phase: dialing.phase,
    revealed: dialing.revealed,
    lockSeq: dialing.lockSeq,
    lockedTargetGlyph: dialing.lockedTargetGlyph,
    rotationRef: dialing.rotationRef,
    animationFrameRef: dialing.animationFrameRef,
    timersRef: dialing.timersRef,
    usedTargetGlyphsRef: dialing.usedTargetGlyphsRef,
    setSelected: dialing.setSelected,
    setPhase: dialing.setPhase,
    setStage: dialing.setStage,
    setRevealed: dialing.setRevealed,
    setLockedChevrons: dialing.setLockedChevrons,
    setLockingChevron: dialing.setLockingChevron,
    setRevealingChevron: dialing.setRevealingChevron,
    setLockedTargetGlyph: dialing.setLockedTargetGlyph,
    setRingRotation: dialing.setRingRotation,
    lockChevron: dialing.lockChevron,
    registerFreeze: tour.setFreeze,
    registerReset: tour.setReset,
  });

  // Anyone can look around the portal; picking a symbol to actually start
  // playing requires an account.
  const handleGlyphClick = (i: number) => {
    if (!authed) {
      setShowLogin(true);
      return;
    }
    dialing.handleTap(i);
  };

  return (
    <>
      {isIframe && <PortalTour />}
      <LoginDialog open={showLogin} onOpenChange={setShowLogin} redirectTo="/portal" />
      <PortalScene
        rotation={dialing.rotation}
        selected={dialing.selected}
        phase={dialing.phase}
        stage={dialing.stage}
        lockedChevrons={dialing.lockedChevrons}
        lockingChevron={dialing.lockingChevron}
        revealingChevron={dialing.revealingChevron}
        lockedTargetGlyph={dialing.lockedTargetGlyph}
        revealed={dialing.revealed}
        tourChevronStep={tour.tourChevronStep}
        tourActionsStep={tour.tourActionsStep}
        isIframe={isIframe}
        onGlyphClick={handleGlyphClick}
      >
        <PortalControls
          phase={dialing.phase}
          selectedLength={dialing.selected.length}
          selected={dialing.selected}
          revealed={dialing.revealed}
          tourPreviewActions={tour.tourPreviewActions}
          tourOpen={tour.tourOpen}
          isIframe={isIframe}
          onReset={dialing.reset}
          onStopSounds={stopAllPortalSounds}
          onGlyphClick={handleGlyphClick}
        />
      </PortalScene>
    </>
  );
}
