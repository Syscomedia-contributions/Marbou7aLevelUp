import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CopyFrameProps {
  /** Code copié au toucher (toujours affiché en LTR). */
  value: string;
  /** Couleur du cadre : doré pour les mots-clés, cyan pour les numéros. */
  tone?: "gold" | "cyan";
  copied: string | null;
  onCopy: (value: string) => void;
  /** Classe additionnelle (ex. prise de toute la largeur de la grille). */
  className?: string;
}

/**
 * Cadre cliquable qui affiche un code (UP, 85800, *800*4#, PASS…) et le copie
 * dans le presse-papiers. Utilisé par les fenêtres d'inscription et de mot de
 * passe oublié, en web et mobile, dans les trois langues.
 */
const CopyFrame = ({
  value,
  tone = "gold",
  copied,
  onCopy,
  className = "",
}: CopyFrameProps) => {
  const { t } = useTranslation();
  const isCopied = copied === value;
  const label = isCopied ? t("auth.copied") : t("auth.copy");

  return (
    <button
      type="button"
      dir="ltr"
      className={`sms-copy-frame sms-copy-frame--${tone}${isCopied ? " is-copied" : ""} ${className}`}
      onClick={() => onCopy(value)}
      aria-label={`${label} ${value}`}
      title={`${label} ${value}`}
    >
      <span className="sms-copy-frame__value">{value}</span>
      <span className="sms-copy-frame__action">
        {isCopied ? (
          <Check className="w-3 h-3" aria-hidden />
        ) : (
          <Copy className="w-3 h-3" aria-hidden />
        )}
        <span>{label}</span>
      </span>
    </button>
  );
};

export default CopyFrame;
