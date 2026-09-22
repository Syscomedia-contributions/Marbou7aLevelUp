import { Trans } from "react-i18next";
import i18n from "@/i18n";
import { cn } from "@/lib/utils";

export const SectionHeading = ({
  eyebrow,
  titleKey,
  title,
  subtitle,
  subtitleClassName,
}: {
  eyebrow: string;
  titleKey?: string;
  title?: React.ReactNode;
  subtitle?: string;
  subtitleClassName?: string;
}) => (
  <div className="max-w-4xl mx-auto text-center">
    <span className={`inline-block font-semibold tracking-[0.2em] uppercase text-accent mb-3 ${i18n.language === "ar" ? "text-base sm:text-lg" : "text-xs"}`}>{eyebrow}</span>
    <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight break-words">

      {titleKey ? (
        <Trans
          i18nKey={titleKey}
          components={{
            grad: <span className="text-gradient" />,
            gold: <span className="text-gold-gradient" />,
          }}
        />
      ) : (
        title
      )}
    </h2>
    {subtitle && <p className={cn("mt-4", subtitleClassName || "text-muted-foreground")}>{subtitle}</p>}
  </div>
);
