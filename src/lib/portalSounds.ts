// Portal sound effects — CDN-hosted MP3s (pointers in src/assets/SFX/).
import chevronOpenSoundUrl from "@/assets/SFX/chevron-unlock-lock-amplified.mp3";
// NOTE: chevron-close.mp3 is missing from Lovable's own asset storage (404 even on
// the live deployment) — this predates the backend migration. Left pointing at the
// original (already-broken) reference until a replacement SFX file is supplied.
import chevronCloseAsset from "@/assets/SFX/chevron-close.mp3.asset.json";
import chevronUnlockLockV6Url from "@/assets/SFX/chevron-unlock-lock-amplified.mp3";
import symbolClickSoundUrl from "@/assets/SFX/symbol-click.mp3";
import alarmSoundUrl from "@/assets/SFX/alarm.mp3";
const chevronCloseSoundUrl = chevronCloseAsset.url;
// Mobile-only combined unlock+lock chevron SFX (used by PortalPage.tsx).

import { logAudio } from "@/lib/portalAudioDebug";
const shortUrl = (u: string) => u.split("/").pop()?.split("?")[0] ?? u;

// ---- Active-sound registry so we can stop everything on navigation. ----
const activeAudios = new Set<HTMLAudioElement>();
const activeContexts = new Set<AudioContext>();
const activeStoppers = new Set<() => void>();
const activeSources = new Set<AudioScheduledSourceNode>();

// ---- Shared AudioContext + iOS gesture unlock -----------------------------
// iOS Safari requires that an AudioContext be created/resumed inside a user
// gesture. Once unlocked, the same context can play sounds later from timers.
// Creating a NEW AudioContext inside a setTimeout on iOS gives you a
// permanently-suspended context — which is why the synthesized ring rumble
// and any MP3 played via new Audio() from a timer produce no sound.
let sharedCtx: AudioContext | null = null;
let audioUnlocked = false;

// When the portal is shown inside the "🎬 Comment jouer" iframe guide, we mute
// every portal SFX (chevron lock, symbol click, ring rumble) so only the tour
// narration — which lives in PortalTour.tsx and uses its own HTMLAudio element,
// not this module — is heard. The flag is toggled by PortalPage on mount/unmount
// of the iframe context.
// Muted synchronously at module load when we are inside an iframe (the guide
// modal is the only place the portal is embedded), so no SFX can slip through
// before React effects run.
let portalSfxMuted = (() => {
  try {
    return typeof window !== "undefined" && window.self !== window.top;
  } catch {
    return true; // cross-origin access error ⇒ we are framed
  }
})();
export const setPortalSfxMuted = (muted: boolean) => {
  portalSfxMuted = muted;
  if (!muted) return;
  activeAudios.forEach((audio) => {
    try { audio.pause(); audio.currentTime = 0; } catch { /* noop */ }
  });
  activeAudios.clear();
  activeStoppers.forEach((stop) => { try { stop(); } catch { /* noop */ } });
  activeStoppers.clear();
  activeSources.forEach((source) => { try { source.stop(); } catch { /* noop */ } });
  activeSources.clear();
};
export const isPortalSfxMuted = () => portalSfxMuted;

// Chevron lock/unlock SFX are ALWAYS allowed, even while the portal is muted
// inside the "Comment jouer" guide iframe: the tour must keep its chevron
// unlock/lock feedback (project rule). Only ambient/alarm/rotation/click SFX
// are silenced there.
const chevronExemptUrls = new Set<string>();
const isSfxBlocked = (url?: string) =>
  portalSfxMuted && !(url !== undefined && chevronExemptUrls.has(url));

const chevronBuffers: Record<string, AudioBuffer | null> = {};
// Pre-fetched raw MP3 bytes (fetched at module load, before any gesture) so
// that decoding can happen instantly the moment the AudioContext unlocks.
const chevronArrayBuffers: Record<string, ArrayBuffer | null> = {};
const chevronFetches: Record<string, Promise<void>> = {};
// URLs whose WebAudio decode failed — HTMLAudio fallback is still tried.
const chevronBroken: Set<string> = new Set();
// URLs whose HTMLAudio fallback also failed — give up to avoid warning spam.
const chevronHtmlBroken: Set<string> = new Set();

// ---- HTMLAudio fallback pool ---------------------------------------------
// iOS Safari will occasionally refuse to run the shared AudioContext (e.g.
// when a competing HTMLAudio session — the tour narration — has just been
// paused and the audio category hasn't fully switched back yet). In that
// window, WebAudio calls succeed silently and produce no output. To recover,
// we keep a small pool of primed HTMLAudio elements per SFX URL. HTMLAudio
// uses the "ambient" iOS audio session and plays even when WebAudio is
// muted, as long as each element was primed inside a user gesture.
const htmlAudioPool: Record<string, HTMLAudioElement[]> = {};
const htmlAudioCursor: Record<string, number> = {};
let htmlPoolPrimed = false;

const primeHtmlAudioPool = () => {
  if (htmlPoolPrimed || typeof window === "undefined") return;
  htmlPoolPrimed = true;
  // NOTE: we intentionally do NOT call play()/pause() here to "unlock" the
  // element for iOS. On mobile browsers, `muted = true` does not take effect
  // until the play() promise resolves — so a few frames of the chevron SFX
  // leak audibly on the very first tap, producing a repeating chevron sound.
  // We rely on WebAudio (unlocked via getSharedAudioContext + silent buffer
  // in `unlockPortalAudio`) as the primary playback path; HTMLAudio is only
  // a best-effort fallback and is populated lazily inside `playViaHtmlAudio`.
  const urls = [chevronOpenSoundUrl, chevronCloseSoundUrl, chevronUnlockLockV6Url, symbolClickSoundUrl];
  urls.forEach((url) => {
    try {
      const a = new Audio(url);
      a.preload = "auto";
      a.load();
      htmlAudioPool[url] = [a];
      htmlAudioCursor[url] = 0;
    } catch { /* noop */ }
  });
};


const playViaHtmlAudio = (url: string, volume: number): boolean => {
  if (chevronHtmlBroken.has(url)) return false;
  let pool = htmlAudioPool[url];
  if (!pool || pool.length === 0) {
    try {
      const a = new Audio(url);
      a.preload = "auto";
      pool = [a];
      htmlAudioPool[url] = pool;
      htmlAudioCursor[url] = 0;
    } catch {
      chevronHtmlBroken.add(url);
      return false;
    }
  }
  const idx = (htmlAudioCursor[url] ?? 0) % pool.length;
  htmlAudioCursor[url] = idx + 1;
  const a = pool[idx];
  try {
    a.pause();
    a.currentTime = 0;
    a.volume = Math.max(0, Math.min(1, volume));
    activeAudios.add(a);
    const p = a.play();
    if (p && typeof p.then === "function") {
      p.catch((e) => {
        console.warn("[portalSounds] HTMLAudio fallback failed", url, e);
        chevronHtmlBroken.add(url);
      });
    }
    a.onended = () => activeAudios.delete(a);
    return true;
  } catch (e) {
    console.warn("[portalSounds] HTMLAudio fallback threw", url, e);
    chevronHtmlBroken.add(url);
    return false;
  }
};

const primeHtmlAudioForDelayedReplay = (
  url: string,
  volume: number,
  delayMs: number,
  onFire?: () => void,
): (() => void) => {
  let cancelled = false;
  let timer: number | null = null;
  let audio: HTMLAudioElement | null = null;

  const playAudible = () => {
    if (cancelled) return;
    onFire?.();
    if (!audio) {
      playViaHtmlAudio(url, volume);
      return;
    }
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      audio.volume = Math.max(0, Math.min(1, volume));
      activeAudios.add(audio);
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.catch(() => playViaHtmlAudio(url, volume));
      }
      audio.onended = () => activeAudios.delete(audio!);
    } catch {
      playViaHtmlAudio(url, volume);
    }
  };

  try {
    audio = new Audio(url);
    audio.preload = "auto";
    audio.muted = true;
    audio.volume = 0;
    audio.load();
    // Called inside the tap handler: this primes this exact media element for
    // iOS, then the timer replays the same element at the visual lock frame.
    const p = audio.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        try { audio?.pause(); if (audio) audio.currentTime = 0; } catch {}
      }).catch(() => { /* regular fallback timer below will try anyway */ });
    }
  } catch {
    audio = null;
  }

  timer = window.setTimeout(playAudible, Math.max(0, delayMs));
  return () => {
    cancelled = true;
    if (timer !== null) window.clearTimeout(timer);
    if (audio) {
      try { audio.pause(); } catch {}
      activeAudios.delete(audio);
    }
  };
};

const prefetchChevronBytes = (url: string): Promise<void> => {
  if (chevronFetches[url]) return chevronFetches[url];
  chevronFetches[url] = fetch(url)
    .then((r) => r.arrayBuffer())
    .then((ab) => { chevronArrayBuffers[url] = ab; })
    .catch((e) => { console.warn("[portalSounds] chevron fetch failed", url, e); });
  return chevronFetches[url];
};

// Kick off the network fetch immediately — no gesture needed for fetch().
if (typeof window !== "undefined") {
  void prefetchChevronBytes(chevronOpenSoundUrl);
  void prefetchChevronBytes(chevronCloseSoundUrl);
  void prefetchChevronBytes(chevronUnlockLockV6Url);
  void prefetchChevronBytes(symbolClickSoundUrl);
  void prefetchChevronBytes(alarmSoundUrl);
}

const getAC = (): typeof AudioContext | undefined =>
  (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
  (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

const isIOSAudioDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { platform?: string; maxTouchPoints?: number };
  return /iPad|iPhone|iPod/i.test(nav.userAgent)
    || (nav.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1);
};

export const getSharedAudioContext = (): AudioContext | null => {
  if (sharedCtx && sharedCtx.state !== "closed") return sharedCtx;
  const AC = getAC();
  if (!AC) return null;
  try {
    sharedCtx = new AC();
    return sharedCtx;
  } catch {
    return null;
  }
};

const decodeChevronBuffer = async (url: string) => {
  if (chevronBuffers[url]) return;
  if (chevronBroken.has(url)) return;
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  await prefetchChevronBytes(url);
  const ab = chevronArrayBuffers[url];
  if (!ab) return;
  try {
    const buf = await new Promise<AudioBuffer>((resolve, reject) => {
      try {
        const p = ctx.decodeAudioData(ab.slice(0), resolve, reject);
        if (p && typeof (p as unknown as Promise<AudioBuffer>).then === "function") {
          (p as unknown as Promise<AudioBuffer>).then(resolve, reject);
        }
      } catch (e) { reject(e); }
    });
    chevronBuffers[url] = buf;
  } catch (e) {
    // Corrupted / unsupported MP3 for WebAudio. Mark as broken for WebAudio
    // only — HTMLAudio can often still play the same MP3.
    chevronBroken.add(url);
    console.warn("[portalSounds] chevron decode failed (WebAudio marked broken)", url, e);
  }
};

export const unlockPortalAudio = () => {
  // Always try to prime the HTMLAudio pool inside the current gesture — the
  // fallback needs primed elements to play from later timers on iOS.
  primeHtmlAudioPool();
  const ctx = getSharedAudioContext();
  if (!ctx) { logAudio("unlock", "no AudioContext available"); return; }
  logAudio("unlock:call", `state=${ctx.state}`);
  if (ctx.state === "suspended") {
    ctx.resume()
      .then(() => logAudio("unlock:resume", `state=${ctx.state}`))
      .catch((e) => { console.warn("[portalSounds] resume failed", e); logAudio("unlock:resume:fail", String(e)); });
  }
  if (audioUnlocked) return;
  try {
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    logAudio("unlock:silent-buffer", "ok");
  } catch (e) { logAudio("unlock:silent-buffer:fail", String(e)); }
  audioUnlocked = true;
  void decodeChevronBuffer(chevronOpenSoundUrl);
  void decodeChevronBuffer(chevronCloseSoundUrl);
  void decodeChevronBuffer(chevronUnlockLockV6Url);
  void decodeChevronBuffer(symbolClickSoundUrl);
  void decodeChevronBuffer(alarmSoundUrl);
};

/** Reveal-time alarm played via the shared (unlocked) WebAudio context so
 *  it doesn't compete with pending HTMLAudio schedules on iOS. */
export const playRevealAlarmSound = (volume = 0.6) => playChevronBuffer(alarmSoundUrl, volume);

// NOTE: We intentionally do NOT install global touchstart/pointerdown listeners
// that create an AudioContext on the first tap. On iOS, instantiating an
// AudioContext changes the audio session category and interrupts any HTMLAudio
// (like the tour guide narration) that is currently playing via autoplay.
// Instead, portal SFX call `unlockPortalAudio()` from inside the specific
// user-gesture handlers that trigger them (symbol taps, chevron taps).


export const stopAllPortalSounds = () => {
  activeAudios.forEach((a) => { try { a.pause(); } catch {} });
  activeAudios.clear();
  activeStoppers.forEach((s) => { try { s(); } catch {} });
  activeStoppers.clear();
  activeSources.forEach((s) => { try { s.stop(); } catch {} });
  activeSources.clear();
  // NOTE: Do NOT close the shared context — closing it on iOS means it
  // cannot be reopened without another user gesture, breaking future SFX.
  activeContexts.forEach((c) => {
    if (c === sharedCtx) return;
    try { if (c.state !== "closed") c.close().catch(() => {}); } catch {}
  });
  activeContexts.clear();
};

// Play a chevron MP3 via the shared (unlocked) AudioContext when possible.
// If WebAudio is unavailable (no AudioContext, still suspended after resume,
// decode failed, or the buffer source throws), fall back to a primed
// HTMLAudio element from the pool so iOS still gets audible SFX.
const actuallyPlayBuffer = (ctx: AudioContext, buf: AudioBuffer, volume: number): boolean => {
  try {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = volume;
    src.connect(g).connect(ctx.destination);
    src.start(0);
    activeSources.add(src);
    src.onended = () => activeSources.delete(src);
    return true;
  } catch (e) {
    console.warn("[portalSounds] buffer play failed, falling back to HTMLAudio", e);
    return false;
  }
};

const playChevronBuffer = (url: string, volume: number) => {
  if (isSfxBlocked(url)) return;
  const ctx = getSharedAudioContext();
  const short = shortUrl(url);
  if (!ctx || ctx.state !== "running") {
    logAudio("sfx:webaudio-not-ready", `${short} ctx=${ctx?.state ?? "none"}`);
    if (ctx && ctx.state === "suspended") ctx.resume().catch((e) => logAudio("sfx:resume-fail", String(e)));
    if (!ctx || ctx.state !== "running") {
      const ok = playViaHtmlAudio(url, volume);
      logAudio("sfx:html", `${short} ok=${ok}`);
      return;
    }
  }
  if (chevronBroken.has(url)) {
    const ok = playViaHtmlAudio(url, volume);
    logAudio("sfx:html(broken-buf)", `${short} ok=${ok}`);
    return;
  }
  const buf = chevronBuffers[url];
  if (buf) {
    const ok = actuallyPlayBuffer(ctx, buf, volume);
    logAudio(ok ? "sfx:webaudio" : "sfx:webaudio-fail→html", `${short}`);
    if (!ok) playViaHtmlAudio(url, volume);
    return;
  }
  void decodeChevronBuffer(url);
  const ok = playViaHtmlAudio(url, volume);
  logAudio("sfx:html(no-buf)", `${short} ok=${ok}`);
};

/** Chevron opening SFX (locks in place during dialing / reveal sequence). */
export const playChevronOpenSound = (volume = 1.0) => playChevronBuffer(chevronOpenSoundUrl, volume);
/** Chevron closing SFX (portal shutdown). */
export const playChevronCloseSound = (volume = 1.0) => playChevronBuffer(chevronCloseSoundUrl, volume);
/** Mobile-only combined chevron unlock+lock SFX (single MP3, PortalPage.tsx). */
export const playChevronUnlockLockV6Sound = (volume = 0.85) => playChevronBuffer(chevronUnlockLockV6Url, volume);
/** Glyph/symbol selection click SFX (uploaded metallic click) — softened. */
export const playSymbolClickSound = (volume = 0.55) => playChevronBuffer(symbolClickSoundUrl, volume);

/**
 * iOS-safe delayed SFX. Creates & starts an AudioBufferSourceNode inside the
 * CURRENT synchronous call (must be a user gesture on iOS) but schedules its
 * playback for `delayMs` in the future via WebAudio's sample-accurate clock.
 * Because the source is instantiated within the gesture, iOS Safari treats
 * the deferred output as gesture-authorized — no silence, no drift.
 * Returns a cancel function. Falls back to a regular timeout+HTMLAudio path
 * when WebAudio is unavailable.
 */
export const scheduleChevronBufferAtGesture = (
  url: string,
  volume: number,
  delayMs: number,
): (() => void) => {
  if (isSfxBlocked(url)) return () => {};
  const short = shortUrl(url);
  logAudio("sched:call", `${short} +${delayMs}ms iOS=${isIOSAudioDevice()}`);
  // NOTE: previously iOS was forced onto the HTMLAudio-only path here. That
  // path breaks when a second HTMLAudio (the reveal alarm) starts on the
  // same iOS audio session before the delayed one fires — the pending
  // playback is interrupted and the chevron lock goes silent. The WebAudio
  // scheduler below already primes an HTMLAudio backup while the buffer
  // decodes, so iOS gets both a sample-accurate WebAudio schedule AND the
  // HTMLAudio fallback if WebAudio can't take over in time.



  const ctx = getSharedAudioContext();
  const doFallback = () => {
    const id = window.setTimeout(() => playViaHtmlAudio(url, volume), delayMs);
    return () => window.clearTimeout(id);
  };
  const doGestureFallback = () => primeHtmlAudioForDelayedReplay(url, volume, delayMs);
  if (!ctx || ctx.state !== "running") {
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    if (!ctx || ctx.state !== "running") return doGestureFallback();
  }
  const startAt = ctx.currentTime + Math.max(0, delayMs) / 1000;
  const startWithBuf = (buf: AudioBuffer): (() => void) => {
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = volume;
      src.connect(g).connect(ctx.destination);
      src.start(startAt);
      activeSources.add(src);
      src.onended = () => activeSources.delete(src);
      return () => { try { src.stop(); } catch {} };
    } catch {
      return doFallback();
    }
  };
  const buf = chevronBuffers[url];
  if (buf) return startWithBuf(buf);
  // Decode first, but keep gesture credit: if decode finishes before delay,
  // schedule at the original startAt so the sound still lands on time.
  let cancelled = false;
  let cancelFn: (() => void) | null = null;
  let htmlBackupFired = false;
  let htmlBackupCancel: (() => void) | null = primeHtmlAudioForDelayedReplay(url, volume, delayMs, () => {
    htmlBackupFired = true;
  });
  void decodeChevronBuffer(url).then(() => {
    if (cancelled) return;
    if (htmlBackupFired) { cancelFn = null; htmlBackupCancel = null; return; }
    const b = chevronBuffers[url];
    if (!b) { cancelFn = htmlBackupCancel; htmlBackupCancel = null; return; }
    const remaining = Math.max(0, startAt - ctx.currentTime);
    try {
      const src = ctx.createBufferSource();
      src.buffer = b;
      const g = ctx.createGain();
      g.gain.value = volume;
      src.connect(g).connect(ctx.destination);
      src.start(ctx.currentTime + remaining);
      activeSources.add(src);
      src.onended = () => activeSources.delete(src);
      htmlBackupCancel?.();
      htmlBackupCancel = null;
      cancelFn = () => { try { src.stop(); } catch {} };
    } catch {
      cancelFn = htmlBackupCancel ?? doFallback();
      htmlBackupCancel = null;
    }
  });
  return () => {
    cancelled = true;
    if (cancelFn) cancelFn();
    if (htmlBackupCancel) htmlBackupCancel();
  };
};

/** Schedule the mobile chevron unlock+lock SFX to fire in `delayMs`, but
 *  create the WebAudio source SYNCHRONOUSLY inside the current tap gesture
 *  so iOS Safari authorizes the deferred playback. */
export const scheduleChevronLockV6SoundAtGesture = (delayMs: number, volume = 1.0) =>
  scheduleChevronBufferAtGesture(chevronUnlockLockV6Url, volume, delayMs);


/** Inner-ring rotation cue — Stargate-style mechanical grinding rumble
 *  synthesized with Web Audio: deep low-end rumble + filtered noise grind
 *  + periodic metallic clanks at the chevron-passing cadence. */
export const playRingRotationSound = (): (() => void) => {
  if (portalSfxMuted) return () => {};
  const AC: typeof AudioContext | undefined =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return () => {};

  let stopped = false;
  const ctx = getSharedAudioContext();
  if (!ctx) { logAudio("rotation:no-ctx"); return () => {}; }
  logAudio("rotation:start", `ctx=${ctx.state}`);
  activeContexts.add(ctx);

  // Nodes we may need to stop from the returned stopFn — populated once
  // playback actually starts (either immediately, or after resume() resolves).
  let master: GainNode | null = null;
  let osc1: OscillatorNode | null = null;
  let osc2: OscillatorNode | null = null;
  let lfo: OscillatorNode | null = null;
  let noise: AudioBufferSourceNode | null = null;
  let grindLFO: OscillatorNode | null = null;
  let clankTimer: number | null = null;

  const startGraph = () => {
    if (stopped) return;
    const now = ctx.currentTime;

    master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.85, now + 0.35);
    master.connect(ctx.destination);

    const rumbleLP = ctx.createBiquadFilter();
    rumbleLP.type = "lowpass";
    rumbleLP.frequency.value = 220;
    rumbleLP.Q.value = 0.7;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.75;
    rumbleLP.connect(rumbleGain).connect(master);

    osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.value = 55;
    osc2 = ctx.createOscillator();
    osc2.type = "sawtooth";
    osc2.frequency.value = 58;
    osc1.connect(rumbleLP);
    osc2.connect(rumbleLP);
    osc1.start(now);
    osc2.start(now);

    lfo = ctx.createOscillator();
    lfo.frequency.value = 0.8;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 6;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);
    lfo.start(now);

    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const noiseBP = ctx.createBiquadFilter();
    noiseBP.type = "bandpass";
    noiseBP.frequency.value = 650;
    noiseBP.Q.value = 1.2;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.35;
    noise.connect(noiseBP).connect(noiseGain).connect(master);
    noise.start(now);

    grindLFO = ctx.createOscillator();
    grindLFO.frequency.value = 1.6;
    const grindLFOGain = ctx.createGain();
    grindLFOGain.gain.value = 280;
    grindLFO.connect(grindLFOGain);
    grindLFOGain.connect(noiseBP.frequency);
    grindLFO.start(now);

    const scheduleClank = () => {
      if (stopped || !master) return;
      const t = ctx.currentTime;
      const c = ctx.createOscillator();
      c.type = "square";
      c.frequency.setValueAtTime(180, t);
      c.frequency.exponentialRampToValueAtTime(70, t + 0.18);
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.0, t);
      cg.gain.linearRampToValueAtTime(0.45, t + 0.008);
      cg.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      const cf = ctx.createBiquadFilter();
      cf.type = "lowpass";
      cf.frequency.value = 1200;
      c.connect(cf).connect(cg).connect(master);
      c.start(t);
      c.stop(t + 0.25);
      clankTimer = window.setTimeout(scheduleClank, 260 + Math.random() * 60);
    };
    clankTimer = window.setTimeout(scheduleClank, 200);
  };

  // iOS-critical: if the context is suspended, resume it (still inside the
  // triggering user gesture) and only start the graph once it's actually
  // running — otherwise `osc.start(ctx.currentTime)` schedules at time 0 and
  // the sound is inaudible on the first tap after unlock.
  if (ctx.state === "running") {
    startGraph();
  } else {
    ctx.resume()
      .then(() => { if (!stopped && ctx.state === "running") startGraph(); else logAudio("rotation:still-suspended"); })
      .catch((e) => logAudio("rotation:resume-fail", String(e)));
  }

  const stopFn = () => {
    if (stopped) return;
    stopped = true;
    if (clankTimer !== null) window.clearTimeout(clankTimer);
    const t = ctx.currentTime;
    try {
      if (master) {
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(0.0001, t + 0.35);
      }
    } catch {}
    window.setTimeout(() => {
      try { osc1?.stop(); osc2?.stop(); lfo?.stop(); noise?.stop(); grindLFO?.stop(); } catch {}
      activeContexts.delete(ctx);
      activeStoppers.delete(stopFn);
    }, 420);
  };
  activeStoppers.add(stopFn);
  return stopFn;
};


/** Symbol selection — soft bell-like chime: gentle sinusoidal partials with a
 *  rounded attack, short decay and a tiny shimmer, no harsh metal clank. */
export const playSelectSound = (_step: number = 0) => {
  const AC: typeof AudioContext | undefined =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    const ctx = getSharedAudioContext(); if (!ctx) return; if (ctx.state === "suspended") ctx.resume().catch(() => {});
    activeContexts.add(ctx);
    const t0 = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);

    // Warm low-pass to remove metallic edge
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2800;
    tone.Q.value = 0.6;
    tone.connect(master);

    // Soft bell partials (fundamental + a few gentle overtones)
    const fundamental = 760;
    const partials = [1, 2.0, 3.05];
    const gains = [0.45, 0.22, 0.08];
    const decays = [0.55, 0.38, 0.28];
    partials.forEach((ratio, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = fundamental * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gains[i], t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + decays[i]);
      o.connect(g).connect(tone);
      o.start(t0);
      o.stop(t0 + decays[i] + 0.05);
    });

    // Very subtle rounded noise for the "touch" transient
    const nb = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nd.length, 2.0);
    const noise = ctx.createBufferSource();
    noise.buffer = nb;
    const noiseBP = ctx.createBiquadFilter();
    noiseBP.type = "bandpass";
    noiseBP.frequency.value = 1800;
    noiseBP.Q.value = 3;
    const noiseG = ctx.createGain();
    noiseG.gain.setValueAtTime(0.0, t0);
    noiseG.gain.linearRampToValueAtTime(0.12, t0 + 0.003);
    noiseG.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
    noise.connect(noiseBP).connect(noiseG).connect(master);
    noise.start(t0);
    noise.stop(t0 + 0.08);

    window.setTimeout(() => { /* keep shared context alive */ }, 700);
  } catch {
    /* ignore */
  }
};

/** SGC-style alarm — synthesized mechanical klaxon/warning siren.
 *  Deep two-tone sawtooth alternation (high-low-high-low) like a military
 *  klaxon, with hard square pulses on the amplitude for the "on/off" stutter. */
export const playSGCAlarmSound = () => {
  const AC: typeof AudioContext | undefined =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    const ctx = getSharedAudioContext(); if (!ctx) return; if (ctx.state === "suspended") ctx.resume().catch(() => {});
    activeContexts.add(ctx);
    // Resume if suspended (mobile autoplay policy)
    if (ctx.state === "suspended") { void ctx.resume(); }
    const t0 = ctx.currentTime + 0.02;
    const duration = 1.8;

    // Master bus
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(1.0, t0 + 0.04);
    master.gain.setValueAtTime(1.0, t0 + duration - 0.18);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    master.connect(ctx.destination);

    // Low-pass to keep it deep & grave
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1100;
    lp.Q.value = 0.8;
    lp.connect(master);

    // Two-tone klaxon: alternate 220 Hz <-> 330 Hz every 0.22s
    const beatTimes: number[] = [];
    for (let t = 0; t < duration - 0.1; t += 0.22) beatTimes.push(t);

    const makeTone = (detune: number, gainVal: number) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.detune.value = detune;
      osc.frequency.setValueAtTime(220, t0);
      beatTimes.forEach((bt, i) => {
        osc.frequency.setValueAtTime(i % 2 === 0 ? 330 : 220, t0 + bt);
      });
      const g = ctx.createGain();
      // Hard on/off envelope per beat (square pulse)
      g.gain.setValueAtTime(0, t0);
      beatTimes.forEach((bt) => {
        g.gain.setValueAtTime(gainVal, t0 + bt + 0.005);
        g.gain.setValueAtTime(gainVal * 0.15, t0 + bt + 0.17);
      });
      g.gain.setValueAtTime(0, t0 + duration);
      osc.connect(g).connect(lp);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    };
    makeTone(0, 0.55);
    makeTone(-8, 0.4); // slight detune for thickness

    // Sub layer for "weight"
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(110, t0);
    beatTimes.forEach((bt, i) => {
      sub.frequency.setValueAtTime(i % 2 === 0 ? 165 : 110, t0 + bt);
    });
    const subG = ctx.createGain();
    subG.gain.value = 0.35;
    sub.connect(subG).connect(master);
    sub.start(t0);
    sub.stop(t0 + duration + 0.05);

    window.setTimeout(() => { /* keep shared context alive */ }, (duration + 0.3) * 1000);
  } catch {
    /* ignore */
  }
};

/** Total duration of the reveal sequence in ms. */
export const REVEAL_SEQUENCE_MS = 7500;
/** When the vortex explosion hits (ms from start) — sync the visual reveal here. */
export const REVEAL_EXPLOSION_AT_MS = 6500;

export const playRevealSound = () => {
  playChevronOpenSound(1.0);
};

/** Result jingle adapted to score ratio.
 *  ratio == 1    → joyful perfect-score fanfare (8/8)
 *  ratio >= 0.5  → happy ascending arpeggio (bien)
 *  ratio >  0    → neutral soft chime (moyen)
 *  ratio == 0    → sad descending trombone (échec)
 */
export const playQuizResultSound = (ratio: number = 1) => {
  const AC: typeof AudioContext | undefined =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;

  const schedule = (ctx: AudioContext) => {
    try {
      activeContexts.add(ctx);
      const t0 = ctx.currentTime + 0.05;

      const master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);

      type Note = { f: number; t: number; d: number; type?: OscillatorType; gain?: number };
      let notes: Note[] = [];
      let totalMs = 1800;

      if (ratio === 1) {
        notes = [
          { f: 523.25, t: 0.00, d: 0.12 },
          { f: 659.25, t: 0.12, d: 0.12 },
          { f: 783.99, t: 0.24, d: 0.12 },
          { f: 1046.5, t: 0.36, d: 0.18 },
          { f: 1318.5, t: 0.54, d: 0.75, gain: 0.45 },
          { f: 1568.0, t: 0.54, d: 0.75, gain: 0.35 },
          { f: 2093.0, t: 0.54, d: 0.75, gain: 0.25 },
        ];
        totalMs = 1600;
      } else if (ratio >= 0.5) {
        notes = [
          { f: 523.25, t: 0.00, d: 0.16 },
          { f: 659.25, t: 0.16, d: 0.16 },
          { f: 880.00, t: 0.32, d: 0.45, gain: 0.45 },
        ];
        totalMs = 1100;
      } else if (ratio > 0) {
        notes = [
          { f: 587.33, t: 0.00, d: 0.22 },
          { f: 698.46, t: 0.22, d: 0.45, gain: 0.4 },
        ];
        totalMs = 900;
      } else {
        notes = [
          { f: 233.08, t: 0.00, d: 0.60, type: "sawtooth", gain: 0.55 },
          { f: 196.00, t: 0.50, d: 0.60, type: "sawtooth", gain: 0.55 },
          { f: 164.81, t: 1.00, d: 0.60, type: "sawtooth", gain: 0.55 },
          { f: 130.81, t: 1.50, d: 1.00, type: "sawtooth", gain: 0.6 },
        ];
        totalMs = 2800;
      }

      notes.forEach((n) => {
        const ts = t0 + n.t;
        const te = ts + n.d;
        const osc = ctx.createOscillator();
        osc.type = n.type ?? "triangle";
        osc.frequency.setValueAtTime(n.f, ts);
        if (ratio === 0) {
          osc.frequency.linearRampToValueAtTime(n.f * 0.92, te);
        }
        const g = ctx.createGain();
        const peak = n.gain ?? 0.55;
        g.gain.setValueAtTime(0.0001, ts);
        g.gain.exponentialRampToValueAtTime(peak, ts + 0.02);
        g.gain.setValueAtTime(peak, te - 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, te);

        if (ratio === 0) {
          const wah = ctx.createBiquadFilter();
          wah.type = "lowpass";
          wah.Q.value = 4;
          const lfo = ctx.createOscillator();
          lfo.type = "sine";
          lfo.frequency.value = 1.6;
          const lfoGain = ctx.createGain();
          lfoGain.gain.value = 700;
          lfo.connect(lfoGain);
          lfoGain.connect(wah.frequency);
          lfo.start(ts);
          lfo.stop(te + 0.05);
          osc.connect(g).connect(wah).connect(master);
        } else {
          osc.connect(g).connect(master);
        }
        osc.start(ts);
        osc.stop(te + 0.05);
      });

      window.setTimeout(() => { /* keep shared context alive */ }, totalMs + 400);
    } catch {
      /* ignore */
    }
  };

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    if (ctx.state === "running") {
      schedule(ctx);
      return;
    }
    // Suspended (common on mobile after a background/narration switch):
    // resume, then schedule once the context is actually running. Retry a
    // second time after a short delay if the first resume didn't take.
    ctx.resume().then(() => {
      if (ctx.state === "running") {
        schedule(ctx);
      } else {
        window.setTimeout(() => {
          ctx.resume().catch(() => {});
          if (ctx.state === "running") schedule(ctx);
        }, 180);
      }
    }).catch(() => {
      window.setTimeout(() => {
        ctx.resume().catch(() => {});
        if (ctx.state === "running") schedule(ctx);
      }, 180);
    });
  } catch {
    /* ignore */
  }
};

/** Timeout buzzer — soft muted "dull thud" rather than a harsh game-show honk. */
export const playTimeoutSound = () => {
  const AC: typeof AudioContext | undefined =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    const ctx = getSharedAudioContext(); if (!ctx) return; if (ctx.state === "suspended") ctx.resume().catch(() => {});
    activeContexts.add(ctx);
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime + 0.01;

    const master = ctx.createGain();
    master.gain.value = 0.65;
    master.connect(ctx.destination);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 700;
    lp.Q.value = 0.8;
    lp.connect(master);

    // Two soft, muted pulses
    const pulses: Array<[number, number]> = [
      [0.0, 0.32],
      [0.42, 0.32],
    ];

    pulses.forEach(([start, dur]) => {
      const ts = t0 + start;
      const te = ts + dur;
      // Gentle rounded triangle tone
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, ts);
      osc.frequency.exponentialRampToValueAtTime(120, te);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ts);
      g.gain.exponentialRampToValueAtTime(0.35, ts + 0.025);
      g.gain.setValueAtTime(0.35, te - 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, te);
      osc.connect(g).connect(lp);
      osc.start(ts);
      osc.stop(te + 0.05);

      // Subtle sine underneath for body
      const sub = ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(75, ts);
      sub.frequency.exponentialRampToValueAtTime(60, te);
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.0001, ts);
      sg.gain.exponentialRampToValueAtTime(0.22, ts + 0.03);
      sg.gain.setValueAtTime(0.22, te - 0.08);
      sg.gain.exponentialRampToValueAtTime(0.0001, te);
      sub.connect(sg).connect(master);
      sub.start(ts);
      sub.stop(te + 0.05);
    });

    window.setTimeout(() => { /* keep shared context alive */ }, 1400);
  } catch {
    /* ignore */
  }
};

/** Correct-answer chime — soft, positive bell-like arpeggio instead of a
 *  noisy applause burst. Rounded attack, gentle decay, no harsh transients. */
export const playCorrectSound = () => {
  const AC: typeof AudioContext | undefined =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    activeContexts.add(ctx);

    const t0 = ctx.currentTime + 0.02;
    const master = ctx.createGain();
    master.gain.value = 0.30;
    master.connect(ctx.destination);

    // Warm low-pass to keep the chime smooth
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3200;
    lp.Q.value = 0.6;
    lp.connect(master);

    type Note = { f: number; t: number; d: number; gain: number };
    const notes: Note[] = [
      { f: 523.25, t: 0.00, d: 0.45, gain: 0.30 },
      { f: 659.25, t: 0.10, d: 0.45, gain: 0.27 },
      { f: 783.99, t: 0.20, d: 0.55, gain: 0.25 },
      { f: 1046.50, t: 0.30, d: 0.75, gain: 0.23 },
    ];

    notes.forEach((n) => {
      const ts = t0 + n.t;
      const te = ts + n.d;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(n.f, ts);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ts);
      g.gain.exponentialRampToValueAtTime(n.gain, ts + 0.015);
      g.gain.setValueAtTime(n.gain, te - 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, te);
      osc.connect(g).connect(lp);
      osc.start(ts);
      osc.stop(te + 0.05);
    });

    // Very subtle shimmer noise for the "sparkle" tail
    const nb = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nd.length, 1.6);
    const noise = ctx.createBufferSource();
    noise.buffer = nb;
    const noiseBP = ctx.createBiquadFilter();
    noiseBP.type = "bandpass";
    noiseBP.frequency.value = 2500;
    noiseBP.Q.value = 2;
    const noiseG = ctx.createGain();
    noiseG.gain.setValueAtTime(0.0, t0);
    noiseG.gain.linearRampToValueAtTime(0.06, t0 + 0.25);
    noiseG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.85);
    noise.connect(noiseBP).connect(noiseG).connect(master);
    noise.start(t0);
    noise.stop(t0 + 0.9);

    window.setTimeout(() => { /* keep shared context alive */ }, 1100);
  } catch {
    /* ignore */
  }
};

/** Wrong-answer cue — soft, descending chime with a gentle "error" feel,
 *  clearly different from the correct-answer bell but still pleasant. */
export const playIncorrectSound = () => {
  const AC: typeof AudioContext | undefined =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    activeContexts.add(ctx);
    if (ctx.state === "suspended") void ctx.resume();

    const t0 = ctx.currentTime + 0.02;
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    lp.Q.value = 0.7;
    lp.connect(master);

    // Soft descending chime: G4 -> D4 -> B3
    type Note = { f: number; t: number; d: number; gain: number };
    const notes: Note[] = [
      { f: 392.0, t: 0.0, d: 0.35, gain: 0.4 },
      { f: 293.66, t: 0.18, d: 0.45, gain: 0.35 },
      { f: 246.94, t: 0.4, d: 0.55, gain: 0.3 },
    ];

    notes.forEach((n) => {
      const ts = t0 + n.t;
      const te = ts + n.d;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(n.f, ts);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ts);
      g.gain.exponentialRampToValueAtTime(n.gain, ts + 0.02);
      g.gain.setValueAtTime(n.gain, te - 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, te);
      osc.connect(g).connect(lp);
      osc.start(ts);
      osc.stop(te + 0.05);
    });

    // Subtle sub-bass thump for body
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(80, t0);
    sub.frequency.exponentialRampToValueAtTime(60, t0 + 0.6);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t0);
    sg.gain.exponentialRampToValueAtTime(0.25, t0 + 0.04);
    sg.gain.setValueAtTime(0.25, t0 + 0.45);
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    sub.connect(sg).connect(master);
    sub.start(t0);
    sub.stop(t0 + 0.75);

    window.setTimeout(() => { /* keep shared context alive */ }, 1100);
  } catch {
    /* ignore */
  }
};

