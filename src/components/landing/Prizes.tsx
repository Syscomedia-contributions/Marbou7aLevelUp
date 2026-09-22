import { SectionHeading } from "./Features";
import trophy from "@/assets/prize-trophy.png";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const prizeKeys = [
  { key: "monthly", highlight: true },
  { key: "grand", showTrophy: true },
] as const;

const Prizes = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  return (
    <section id="prizes" dir={isAr ? "rtl" : "ltr"} className="pt-0 pb-20 md:pb-28 -mt-8 md:-mt-16 relative overflow-hidden">
      <div className="spotlight opacity-60 [mask-image:linear-gradient(to_bottom,black_0%,black_55%,transparent_92%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_55%,transparent_92%)]" />
      <div className="container relative">
        <SectionHeading
          eyebrow={t("prizes.eyebrow")}
          titleKey="prizes.title"
          subtitle={t("prizes.subtitle")}
          subtitleClassName="text-white"
        />

        <div className="grid grid-cols-1 gap-6 mt-12 max-w-2xl mx-auto">
          {prizeKeys.map((p, i) => (
            <div
              key={p.key}
              className={`glass-card glow-border p-7 relative overflow-hidden animate-fade-in-up ${"highlight" in p && p.highlight ? "md:scale-[1.02]" : ""}`}
              style={{ animationDelay: `${i * 100}ms`, opacity: 0 }}
            >
              {"highlight" in p && p.highlight && (
                <div className="absolute inset-0 bg-gradient-primary opacity-10 pointer-events-none" />
              )}
              <span className={`text-xs md:text-base lg:text-lg font-semibold tracking-wider uppercase text-gold-gradient ${isAr ? "max-sm:text-base" : ""}`}>{t(`prizes.items.${p.key}.tag`)}</span>
              <h3 className="text-2xl font-bold mt-2 mb-3">{t(`prizes.items.${p.key}.title`)}</h3>
              <p className="text-muted-foreground text-sm">{t(`prizes.items.${p.key}.desc`)}</p>
              {"showTrophy" in p && p.showTrophy && (
                <img src={trophy} alt="" loading="lazy" width={768} height={768} className="absolute top-2 right-2 rtl:right-auto rtl:left-2 w-20 opacity-90 animate-float pointer-events-none" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center relative z-10">
          <Link
            to="/portal"
            className={cn(buttonVariants({ variant: "hero", size: "xl" }), "text-lg px-10 font-bold")}
          >
            {i18n.language === "ar" ? (
              <>
                {t("systems.playButton")} <ArrowLeft className="w-4 h-4 mr-2" />
              </>
            ) : (
              <>
                {t("systems.playButton")} <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Prizes;
