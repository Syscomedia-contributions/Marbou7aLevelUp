import { useTranslation } from "react-i18next";

/**
 * Slim bottom-of-page credit — the only footer used site-wide: "By
 * SYSCOMEDIA", tagline, and the copyright line.
 */
const MinimalFooter = () => {
  const { t } = useTranslation();
  return (
    <div className="relative z-10 flex flex-col items-center justify-center gap-1 mt-6 sm:mt-10 py-5 sm:py-7">
      <span className="text-xs text-white/70 font-semibold uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
        By
      </span>
      <span className="text-base text-white font-bold uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
        SYSCOMEDIA
      </span>
      <p className="text-xs text-white/90 font-medium text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
        Système de Communication et Média
      </p>
      <p className="text-xs text-white/90 font-medium text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] mt-2">
        © {new Date().getFullYear()} MARBOU7A CASH. {t("footer.rights")}
      </p>
    </div>
  );
};

export default MinimalFooter;
