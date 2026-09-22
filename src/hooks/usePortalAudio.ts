import { useEffect } from "react";
import { unlockPortalAudio, stopAllPortalSounds, playRevealAlarmSound } from "@/lib/portalSounds";
import chevronUnlockLockUrl from "@/assets/SFX/chevron-unlock-lock-amplified.mp3";
import symbolClickUrl from "@/assets/SFX/symbol-click.mp3";
import frStep1Url from "@/assets/audio/french_step_1.mp3";
import enStep1Url from "@/assets/audio/english_step_1.mp3";
import arStep1Url from "@/assets/audio/arabic_step_1.mp3";

/**
 * Owns every audio side-effect of the portal page:
 *  - Preload critical SFX + all first-step narrations (link/preload +
 *    fetch-into-memory + hidden Audio) so the first mobile session doesn't
 *    stall while decoding MP3s mid-animation.
 *  - Synchronously unlock the shared WebAudio context on the first user
 *    gesture — merges the iOS "audio session category" switch into the
 *    same gesture that (re)starts the guide narration.
 *  - Stop any lingering portal audio on unmount.
 *
 * `scheduledLockCancelsRef` is passed in so the cleanup can cancel any
 * pending gesture-scheduled chevron lock sounds owned by usePortalDialing.
 */
export function usePortalAudio(
  mutePortalSfx: boolean,
  scheduledLockCancelsRef: React.MutableRefObject<(() => void)[]>,
) {
  // 1) Preload SFX + narration for all languages.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const urls = [
      chevronUnlockLockUrl,
      symbolClickUrl,
      frStep1Url,
      enStep1Url,
      arStep1Url,
    ].filter(Boolean) as string[];

    const links: HTMLLinkElement[] = [];
    const audios: HTMLAudioElement[] = [];
    const controllers: AbortController[] = [];

    for (const href of urls) {
      try {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "audio";
        link.href = href;
        (link as HTMLLinkElement & { fetchPriority?: string }).fetchPriority = "high";
        document.head.appendChild(link);
        links.push(link);
      } catch { /* noop */ }

      try {
        const ctrl = new AbortController();
        controllers.push(ctrl);
        void fetch(href, { signal: ctrl.signal, cache: "force-cache" })
          .then((r) => r.arrayBuffer())
          .catch(() => { /* aborted or offline */ });
      } catch { /* noop */ }

      try {
        const a = new Audio();
        a.preload = "auto";
        a.src = href;
        a.muted = true;
        a.load();
        audios.push(a);
      } catch { /* noop */ }
    }

    return () => {
      links.forEach((l) => { try { l.remove(); } catch { /* noop */ } });
      controllers.forEach((c) => { try { c.abort(); } catch { /* noop */ } });
      audios.forEach((a) => { try { a.src = ""; a.load(); } catch { /* noop */ } });
    };
  }, []);

  // First-gesture unlock (iOS/Android audio session switch).
  useEffect(() => {
    let done = false;
    const handler = () => {
      if (done) return;
      done = true;
      unlockPortalAudio();
      window.removeEventListener("pointerdown", handler, true);
      window.removeEventListener("touchstart", handler, true);
      window.removeEventListener("keydown", handler, true);
    };
    window.addEventListener("pointerdown", handler, true);
    window.addEventListener("touchstart", handler, true);
    window.addEventListener("keydown", handler, true);
    return () => {
      window.removeEventListener("pointerdown", handler, true);
      window.removeEventListener("touchstart", handler, true);
      window.removeEventListener("keydown", handler, true);
    };
  }, []);

  // Stargate klaxon — plays as soon as the portal scene loads, to set the
  // "gate activation" atmosphere. Most browsers block the very first
  // autoplay attempt before any gesture, so we retry once on the visitor's
  // first tap/keypress. Stops early once real dialing starts (dispatched by
  // usePortalDialing's handleTap via "portal:stop-alarm").
  useEffect(() => {
    if (mutePortalSfx) return;
    let stopped = false;
    const tryPlay = () => {
      if (stopped) return;
      unlockPortalAudio();
      playRevealAlarmSound(0.5);
    };
    tryPlay();

    const onGesture = () => {
      tryPlay();
      window.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("touchstart", onGesture, true);
      window.removeEventListener("keydown", onGesture, true);
    };
    window.addEventListener("pointerdown", onGesture, true);
    window.addEventListener("touchstart", onGesture, true);
    window.addEventListener("keydown", onGesture, true);

    const onStopAlarm = () => {
      stopped = true;
      stopAllPortalSounds();
    };
    window.addEventListener("portal:stop-alarm", onStopAlarm);

    return () => {
      stopped = true;
      window.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("touchstart", onGesture, true);
      window.removeEventListener("keydown", onGesture, true);
      window.removeEventListener("portal:stop-alarm", onStopAlarm);
    };
  }, [mutePortalSfx]);

  // 4) Unmount — stop any lingering portal audio + cancel scheduled locks.
  useEffect(
    () => () => {
      scheduledLockCancelsRef.current.forEach((cancel) => {
        try { cancel(); } catch { /* noop */ }
      });
      scheduledLockCancelsRef.current = [];
      stopAllPortalSounds();
    },
    [scheduledLockCancelsRef],
  );
}
