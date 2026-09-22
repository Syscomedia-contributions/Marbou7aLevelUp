import { SectionHeading } from "./Features";
import { CheckCircle2, Coins, Gift, RefreshCw, Star, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import AnimatedCounter from "./AnimatedCounter";

const pointKeys = [
  { key: "welcome", icon: Gift },
  { key: "daily", icon: RefreshCw },
  { key: "correct", icon: CheckCircle2 },
  { key: "wrong", icon: XCircle },
  { key: "completed", icon: Star },
] as const;

const Systems = () => {
  const { t } = useTranslation();
  return (
    <section className="pt-0 pb-20 md:pb-28 -mt-8 md:-mt-16 relative">
      <div className="spotlight opacity-60 [mask-image:linear-gradient(to_bottom,black_0%,black_55%,transparent_92%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_55%,transparent_92%)]" />
      <div className="container relative">
        <SectionHeading
          eyebrow={t("systems.eyebrow")}
          titleKey="systems.title"
          subtitle={t("systems.subtitle")}
        />

        <div className="mt-12">
          <div className="glass-card glow-border p-6 md:p-7 relative overflow-hidden animate-fade-in-up" style={{ opacity: 0 }}>
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            <div className="flex items-start justify-end mb-6 relative">
              <Coins className="w-7 h-7 text-gold animate-float shrink-0" />
            </div>

            <ul className="grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-4">
              {pointKeys.map((p, i) => (
                <li key={p.key} className={`glass-card glow-border flex flex-col items-center text-center gap-3 p-4 md:col-span-2 ${i === 3 ? "md:col-start-2" : ""}`}>
                  <div className="w-12 h-12 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
                    <p.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <span className="font-medium text-base leading-tight">{t(`systems.points.${p.key}`)}</span>
                  <AnimatedCounter
                    value={t(`systems.values.${p.key}`)}
                    className="text-gold-gradient font-bold"
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Systems;

