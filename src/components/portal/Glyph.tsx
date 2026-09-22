import { CATEGORIES } from "@/constants/portalConstants";
import { useTranslation } from "react-i18next";

interface GlyphProps {
  index: number;
  pos: { x: number; y: number };
  isSelected: boolean;
  isLocked?: boolean;
  disabled: boolean;
  showGuide: boolean;
  isIframe: boolean;
  onClick: (index: number) => void;
}

export function Glyph({
  index,
  pos,
  isSelected,
  isLocked,
  disabled,
  showGuide,
  isIframe,
  onClick,
}: GlyphProps) {
  const { t } = useTranslation();
  const cat = CATEGORIES[index % CATEGORIES.length];
  return (
    <button
      type="button"
      aria-label={t(`portal.categories.${cat.key}`)}
      onClick={() => onClick(index)}
      disabled={disabled}
      data-tour="symbol"
      data-tour-symbol-index={index}
      data-tour-locked={isLocked ? "true" : undefined}
      aria-hidden={isIframe}
      tabIndex={isIframe ? -1 : 0}
      className={`portal-symbol ${isIframe ? "pointer-events-none" : "pointer-events-auto"} ${isSelected ? "is-selected" : ""}`}
      style={{ top: `${pos.y}%`, left: `${pos.x}%` }}
    >
      <span className={`portal-symbol-inner ${showGuide ? "has-guide" : ""}`} />
      {isSelected && <span className="portal-symbol-pulse" />}
    </button>
  );
}
