import { useEffect, useRef, useState } from "react";
import { X, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { stopAllPortalSounds } from "@/lib/portalSounds";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Experimental "See How to Play" modal.
 *
 * Loads the existing /portal page (and its embedded PortalTour guide + animations)
 * inside an iframe so nothing about the current portal implementation has to change.
 * The iframe keeps its natural size (no scaling): the portal page itself scrolls
 * its viewport so the whole interaction block (Stargate + chevron CTA + glyph
 * keyboard) is vertically centered and fully visible on any screen size.
 * The iframe is only mounted while the modal is open, which guarantees the
 * animation/audio starts fresh when the user opens the modal and fully unmounts
 * (stopping audio) when the modal closes.
 */
const HowToPlayDialog = ({ open, onClose }: Props) => {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [tourFinished, setTourFinished] = useState(false);
  const { t } = useTranslation();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    // A page-level portal alarm may already be armed in the parent window.
    // Stop it before mounting the guide iframe so only its narration remains.
    stopAllPortalSounds();
    window.dispatchEvent(new CustomEvent("portal:stop-alarm"));
    setTourFinished(false);
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data === "portal-tour-finished") {
        setTourFinished(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, reloadKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const node = (
    <div
      ref={backdropRef}
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="See how to play"
    >
      <div className="relative w-full max-w-[1100px] h-[90vh] rounded-2xl overflow-hidden border border-border/40 bg-background shadow-2xl">
        {tourFinished && (
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            aria-label={t("portal.tour.replay", "Réécouter le guide")}
            className="absolute top-3 left-3 z-10 grid place-items-center w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 grid place-items-center w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <iframe
          ref={iframeRef}
          key={`${open ? "open" : "closed"}-${reloadKey}`}
          src="/portal?guide=1"
          title="How to play — Stargate portal guide"
          className="w-full h-full border-0 bg-background"
          allow="autoplay"
        />
      </div>
    </div>
  );

  return createPortal(node, document.body);
};

export default HowToPlayDialog;
