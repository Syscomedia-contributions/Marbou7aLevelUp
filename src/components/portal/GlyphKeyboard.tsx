import { useEffect, useState } from "react";
import { GLYPH_ASSET_URLS, CATEGORIES, cursorHandUrl, portalGlyphSprite } from "@/constants/portalConstants";
import { useTranslation } from "react-i18next";

interface GlyphKeyboardProps {
  selected: number[];
  disabled: boolean;
  showEntryHint?: boolean;
  onGlyphClick: (index: number) => void;
}

/** The hint follows the keyboard's visual order, row by row. */
const HINT_STEP_MS = 1100;

/** Responsive glyph keyboard: all 39 Stargate glyphs, clickable to dial. */
export function GlyphKeyboard({ selected, disabled, showEntryHint = false, onGlyphClick }: GlyphKeyboardProps) {
  const { t } = useTranslation();
  const urls = GLYPH_ASSET_URLS.length ? GLYPH_ASSET_URLS : [];
  const [hintStep, setHintStep] = useState(0);

  useEffect(() => {
    if (!showEntryHint) return;
    const id = window.setInterval(() => {
      setHintStep((s) => s + 1);
    }, HINT_STEP_MS);
    return () => window.clearInterval(id);
  }, [showEntryHint]);

  const hintedIndex = showEntryHint && urls.length ? hintStep % urls.length : -1;

  return (
    <div
      className="portal-glyph-keyboard flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 max-w-full sm:max-w-[56rem] mt-2 sm:mt-3 px-2 sm:px-4 py-2 sm:py-3 max-sm:opacity-[0.96]"
      role="group"
      aria-label={t("portal.selectMore")}
    >
      {urls.map((_, i) => {
        const isSel = selected.includes(i);
        const isHinted = i === hintedIndex && !isSel;
        const cat = CATEGORIES[i % CATEGORIES.length];
        return (
          <button
            key={i}
            type="button"
            data-tour="keyboard-glyph"
            data-tour-keyboard-glyph-index={i}
            disabled={disabled || isSel}
            onClick={() => onGlyphClick(i)}
            aria-label={t(`portal.categories.${cat.key}`)}
            aria-pressed={isSel}
            className={`portal-glyph-key relative grid place-items-center h-7 w-7 sm:h-9 sm:w-9 ${
              isSel ? "is-selected scale-105" : "hover:scale-110"
            } ${isHinted ? "is-hinted" : ""} ${disabled && !isSel ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              aria-hidden="true"
              className="portal-glyph-key__symbol h-5 w-5 sm:h-6 sm:w-6 select-none pointer-events-none"
              style={{
                backgroundImage: `url(${portalGlyphSprite})`,
                backgroundPosition: `${(i / Math.max(urls.length - 1, 1)) * 100}% center`,
              }}
            />
            {isHinted && (
              <span className="portal-glyph-key__hint-hand" aria-hidden="true">
                <img src={cursorHandUrl} alt="" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
