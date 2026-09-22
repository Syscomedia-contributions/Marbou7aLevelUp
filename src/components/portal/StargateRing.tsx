// components/portal/StargateRing.tsx
import { useTranslation } from "react-i18next";
import { Chevron } from "./Chevron";
import { Glyph } from "./Glyph";
import { VortexCore } from "./VortexCore";
import {
  portalFull,
  portalGlyphRing,
  vortexImg,
  cursorHandUrl,
  GLYPH_POSITIONS,
  CHEVRON_ANGLES,
} from "@/constants/portalConstants";
import { QUIZ_CATEGORY_META as QUIZ_CATEGORIES } from "@/data/quiz/categoryMeta";
import { pickCategory, type Lang } from "@/data/quiz/translations";
import type { Phase, Stage, RevealedCat } from "@/types/portal";

interface StargateRingProps {
  rotation: number;
  selected: number[];
  phase: Phase;
  stage: Stage;
  lockedChevrons: number[];
  lockingChevron: number | null;
  revealingChevron: number | null;
  lockedTargetGlyph: number | null;
  revealed: RevealedCat | null;
  tourChevronStep: boolean;
  tourActionsStep: boolean;
  isIframe: boolean;
  onGlyphClick: (index: number) => void;
}

export function StargateRing(props: StargateRingProps) {
  const {
    rotation,
    selected,
    phase,
    stage,
    lockedChevrons,
    lockingChevron,
    revealingChevron,
    lockedTargetGlyph,
    revealed,
    tourActionsStep,
    isIframe,
    onGlyphClick,
  } = props;
  const { t, i18n } = useTranslation();

  const isDialing = phase === "selecting" || phase === "opening";
  const guidanceActive = phase === "idle";

  const stageClass =
    stage === 1
      ? "stage-1"
      : stage === 2
        ? "stage-2"
        : stage === 3
          ? "stage-3"
          : stage === 4
            ? "stage-4"
            : stage === 5
              ? "stage-5"
              : "";

  return (
    <div
      className={`portal-stone w-full ${stageClass} ${phase === "opening" ? "is-opening" : ""} ${phase === "revealed" ? "is-open" : ""} ${tourActionsStep ? "tour-actions-step" : ""}`}
    >
      {/* Ambient FX */}
      {stage === 1 && <div className="portal-alarm" aria-hidden />}
      {(stage === 2 || stage === 3 || stage === 4) && (
        <div className="portal-smoke" aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      )}
      {stage === 4 && <div className="portal-lock-flash" aria-hidden />}
      {stage === 5 && (
        <>
          <div className="portal-kawoosh" aria-hidden>
            <span className="portal-kawoosh-core" />
            <span className="portal-kawoosh-splash" />
            <span className="portal-kawoosh-splash portal-kawoosh-splash-2" />
            <span className="portal-kawoosh-ripple" />
          </div>
          <div className="portal-shockwave" aria-hidden />
          <div className="portal-shockwave portal-shockwave-2" aria-hidden />
        </>
      )}

      <div
        className={`portal-dial ${isDialing ? "is-dialing" : ""} ${stage >= 1 && stage <= 3 ? "is-mechanical" : ""}`}
      >
        {/* Event horizon vortex.
            Rotations 1-2 (stage 0) → old rotating texture.
            From the 3rd rotation onward (stage ≥ 1, set on the final tap)
            and through opening / final reveal → video vortex only.
            The video element is mounted from the first render (hidden) so
            iOS allows it to be primed by the user's first tap. */}
        <VortexCore
          rotation={rotation}
          visible={stage >= 1 || phase === "revealed"}
        />
        {stage < 1 && phase !== "revealed" && (
          <img
            src={vortexImg}
            alt=""
            aria-hidden
            draggable={false}
            className="select-none absolute top-1/2 left-1/2 pointer-events-none"
            style={{
              width: "85%",
              height: "85%",
              objectFit: "contain",
              borderRadius: "9999px",
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              animation: "none",
              filter: "drop-shadow(0 0 30px hsl(200 100% 60% / 0.7))",
              zIndex: 2,
            }}
          />
        )}


        {/* Static Stargate base */}
        <img
          src={portalFull}
          alt="Stargate du Savoir"
          className="absolute top-1/2 left-1/2 pointer-events-none select-none"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: "translate(-50%, -50%)",
            filter: "brightness(1.35) contrast(1.05) saturate(0.6)",
            imageRendering: "crisp-edges",
            zIndex: 4,
          }}
          {...({ fetchpriority: "high" } as any)}
          decoding="async"
        />

        {/* Rotating glyph ring */}
        <img
          src={portalGlyphRing}
          alt=""
          aria-hidden
          className="absolute top-1/2 left-1/2 pointer-events-none select-none"
          draggable={false}
          style={{
            width: "99%",
            height: "99%",
            objectFit: "contain",
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            transformOrigin: "center center",
            filter: "brightness(1.35) contrast(1.05) saturate(0.6)",
            imageRendering: "crisp-edges",
            zIndex: 5,
          }}
          {...({ fetchpriority: "high" } as any)}
          decoding="async"
        />

        {/* Glyph hit zones — rotate with the internal ring */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "50%",
            left: "50%",
            width: "92%",
            height: "92%",
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            transformOrigin: "center center",
            zIndex: 6,
          }}
        >
          {GLYPH_POSITIONS.map((pos, i) => {
            const isSel =
              lockedTargetGlyph !== null
                ? i === lockedTargetGlyph
                : selected.includes(i);
            const disabled = phase === "opening" || phase === "revealed";
            const showGuide = guidanceActive && !isSel;
            return (
              <Glyph
                key={i}
                index={i}
                pos={pos}
                isSelected={isSel}
                isLocked={lockedTargetGlyph === i}
                disabled={disabled}
                showGuide={showGuide}
                isIframe={isIframe}
                onClick={onGlyphClick}
              />
            );
          })}
        </div>

        {/* "Cliquez ici" click hint — shown before any selection */}
        {selected.length === 0 && phase !== "opening" && phase !== "revealed" && (
          <div
            className="portal-click-hint pointer-events-none absolute flex flex-col items-center gap-0 top-[18%] md:top-[21%]"
            style={{
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 12,
            }}
            aria-hidden
          >
            <img
              src={cursorHandUrl}
              alt=""
              className="h-14 w-14 md:h-16 md:w-16 drop-shadow-[0_0_6px_rgba(0,0,0,0.6)]"
            />
            <span
              className="whitespace-nowrap text-base md:text-lg font-semibold tracking-wide"
              style={{
                fontFamily: "'Poppins', system-ui, sans-serif",
                color: "#ffffff",
                textShadow: "0 0 8px rgba(0,0,0,0.7)",
                marginTop: "4px",
              }}
            >
              Cliquez ici
            </span>
          </div>
        )}

        {/* Chevrons */}
        {CHEVRON_ANGLES.map((angle, idx) => (
          <Chevron
            key={`chev-${idx}`}
            angle={angle}
            isLocked={lockedChevrons.includes(idx)}
            isLocking={lockingChevron === idx}
            isRevealing={revealingChevron === idx}
            dataTour={idx === 0}
          />
        ))}
      </div>

      {/* Center reveal card */}
      <div className="absolute inset-0 grid place-items-center pointer-events-none z-20">
        {phase === "revealed" && revealed && (
          <div className="relative flex flex-col items-center gap-2 md:gap-1.5 px-4 pointer-events-auto reveal-pop">
            <span aria-hidden className="reveal-halo" />
            <div className="reveal-badge text-[11px] md:text-[10px] font-black uppercase tracking-[0.25em] text-portal-reveal drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] [html[dir='rtl']_&]:text-[22px] [html[dir='rtl']_&]:md:text-[20px] [html[dir='rtl']_&]:tracking-normal">
              {t("portal.unlocked")}
            </div>
            <div className="reveal-title text-2xl md:text-[1.65rem] font-black leading-none text-portal-reveal drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] [html[dir='rtl']_&]:text-4xl [html[dir='rtl']_&]:md:text-[2.25rem]">
              {pickCategory(revealed.key, i18n.language as Lang)?.name ??
                QUIZ_CATEGORIES.find((c) => c.key === revealed.key)?.name ??
                revealed.key}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
