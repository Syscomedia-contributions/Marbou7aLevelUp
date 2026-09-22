import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlyphKeyboard } from "./GlyphKeyboard";
import type { Phase, RevealedCat } from "@/types/portal";

interface PortalControlsProps {
  phase: Phase;
  selectedLength: number;
  selected: number[];
  revealed: RevealedCat | null;
  tourPreviewActions: boolean;
  tourOpen: boolean;
  isIframe: boolean;
  onReset: () => void;
  onStopSounds: () => void;
  onGlyphClick: (index: number) => void;
}

export function PortalControls({
  phase,
  selectedLength,
  selected,
  revealed,
  tourPreviewActions,
  tourOpen,
  isIframe,
  onReset,
  onStopSounds,
  onGlyphClick,
}: PortalControlsProps) {
  const { t } = useTranslation();
  const isRevealed = phase === "revealed";

  const activationPill = (
    <div className="max-sm:h-14 max-sm:flex max-sm:items-center max-sm:justify-center max-sm:overflow-visible order-1">
      <div className="portal-instruction-pill relative mx-4 sm:mx-0 max-sm:mx-1 flex items-center justify-center text-center gap-2 sm:gap-3 px-5 py-2 sm:px-6 sm:py-1.5 rounded-full bg-card/90 backdrop-blur border border-border shadow-soft text-xs md:text-sm font-extrabold text-foreground">
        <LockOpen className="w-6 h-6 text-cyan animate-pulse" />
        <span className="rtl:text-xl rtl:md:text-2xl">{t("portal.activating")}</span>
      </div>
    </div>
  );

  const selectMorePill = (
    <div className="max-sm:h-14 max-sm:flex max-sm:items-center max-sm:justify-center max-sm:overflow-visible">
      <div className="portal-instruction-pill relative mx-4 sm:mx-0 flex items-center justify-center text-center gap-2 sm:gap-3 px-5 py-2 sm:px-6 sm:py-1.5 rounded-full bg-card/90 backdrop-blur border border-border shadow-soft text-xs md:text-sm font-extrabold text-foreground">
        <Lock className="w-6 h-6 text-primary shrink-0" />
        <span className="portal-select-more-text text-center">
          {t("portal.selectMore")}
        </span>
      </div>
    </div>
  );

  return (
    <div
      id="portal-controls-anchor"
      className="portal-overlay-bottom pointer-events-none absolute left-0 right-0 z-30 flex flex-col items-center px-4 sm:bottom-10"
      style={{
        bottom:
          isRevealed
            ? `calc(env(safe-area-inset-bottom, 0px) + clamp(1rem, 8vh, 6rem))`
            : `calc(env(safe-area-inset-bottom, 0px) + clamp(2rem, 14vh, 8rem))`,
      }}
    >
      {/* Normal controls: counter + instruction + keyboard — moved down 60% on desktop while keeping spacing */}
      {!isRevealed && !tourPreviewActions && (
        <div className="flex flex-col items-center gap-1 sm:gap-3 md:translate-y-[60%] max-sm:translate-y-[30%]">
          {!tourPreviewActions && (
            <div
              data-tour="counter"
              className="hidden text-base md:text-lg font-black leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] max-sm:-translate-y-3 md:translate-y-3"
              style={{
                color: "hsl(195 100% 60%)",
                textShadow:
                  "0 0 16px hsl(195 100% 50% / 0.9), 0 0 32px hsl(195 100% 50% / 0.6), 0 2px 4px rgba(0,0,0,0.9)",
              }}
            >
              <span dir="ltr">
                <span className="text-white">{selectedLength}</span>{" "}
                <span style={{ color: "#32ccff" }}>/ 3</span>
              </span>
            </div>
          )}

          <div className="flex flex-row gap-3 max-sm:gap-0 items-center justify-center mt-2 sm:mt-0">
            {phase === "opening" ? activationPill : selectMorePill}
          </div>

          {(!tourOpen || isIframe) && (
            <div className={`md:-translate-y-[3%] ${isIframe ? "pointer-events-none" : "pointer-events-auto"}`}>
              <GlyphKeyboard
                selected={selected}
                disabled={phase !== "idle"}
                showEntryHint={!isIframe && phase === "idle" && selectedLength === 0}
                onGlyphClick={onGlyphClick}
              />
            </div>
          )}
        </div>
      )}

      {/* Revealed / tour-preview action buttons (not shifted) */}
      {isRevealed && !tourPreviewActions && !(tourOpen && !tourPreviewActions) ? (
        <div className="pointer-events-auto flex flex-col-reverse sm:flex-row gap-3 items-center justify-center mt-2 sm:mt-0 max-sm:-translate-y-[5%]">
          <Button variant="glass" size="xl" onClick={onReset} className="relative z-30 cursor-pointer">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" /> {t("portal.replay")}
          </Button>
          <Button variant="hero" size="xl" asChild className="relative z-30 cursor-pointer">
            <Link to={`/quiz/${revealed?.key}`} onClick={onStopSounds}>
              {t("portal.startQuiz")} <ArrowRight className="w-5 h-5 rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      ) : tourPreviewActions ? (
        <div className="pointer-events-auto flex flex-col-reverse sm:flex-row gap-3 items-center justify-center mt-2 sm:mt-0 max-sm:-translate-y-[5%]">
          <Button
            variant="glass"
            size="xl"
            type="button"
            disabled
            aria-disabled="true"
            className="relative z-30 cursor-not-allowed disabled:opacity-100"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" /> {t("portal.replay")}
          </Button>
          <Button
            variant="hero"
            size="xl"
            type="button"
            disabled
            aria-disabled="true"
            className="relative z-30 cursor-not-allowed disabled:opacity-100"
          >
            {t("portal.startQuiz")} <ArrowRight className="w-5 h-5 rtl:rotate-180" />
          </Button>
        </div>
      ) : isRevealed && !tourPreviewActions && tourOpen ? (
        <div className="flex flex-col-reverse sm:flex-row gap-3 items-center justify-center mt-2 sm:mt-0">
          {selectMorePill}
        </div>
      ) : null}
    </div>
  );
}
