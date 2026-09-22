// Lightweight in-memory audio debug log for the Portal page.
// Enable by adding ?debug=audio to the URL, or by setting
// window.__portalAudioDebug = true before load. Auto-enabled on iOS.

export type AudioDebugEntry = {
  t: number; // ms since page load
  tag: string; // short event label
  detail?: string;
};

const START = typeof performance !== "undefined" ? performance.now() : Date.now();
const MAX_ENTRIES = 80;
const entries: AudioDebugEntry[] = [];
const listeners = new Set<() => void>();

const isIOS = (): boolean => {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { platform?: string; maxTouchPoints?: number };
  return /iPad|iPhone|iPod/i.test(nav.userAgent)
    || (nav.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1);
};

export const isPortalAudioDebugEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { __portalAudioDebug?: boolean };
  if (w.__portalAudioDebug) return true;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get("debug") === "audio" || q.has("audioDebug")) {
      w.__portalAudioDebug = true;
      return true;
    }
  } catch {}
  // Auto-enable on iOS to help diagnose Safari-specific issues.
  if (isIOS()) {
    w.__portalAudioDebug = true;
    return true;
  }
  return false;
};

export const logAudio = (tag: string, detail?: string) => {
  if (typeof window === "undefined") return;
  const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) - START;
  entries.push({ t: now, tag, detail });
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  listeners.forEach((fn) => { try { fn(); } catch {} });
};

export const getAudioLog = (): AudioDebugEntry[] => entries.slice();

export const subscribeAudioLog = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

export const clearAudioLog = () => {
  entries.length = 0;
  listeners.forEach((fn) => { try { fn(); } catch {} });
};
