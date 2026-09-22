import { SectionHeading } from "./Features";
import { Brain, Coins, Lock, Smartphone, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { levelFromXp, loadProgression } from "@/lib/progression";

const stepKeys = [
  { key: "subscribe", icon: Smartphone },
  { key: "answer", icon: Brain },
  { key: "unlock", icon: Lock },
  { key: "collect", icon: Coins },
  { key: "enter", icon: Trophy },
] as const;

const Gameplay = () => {
  const { t } = useTranslation();
  const [maxReached, setMaxReached] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadProgression().then((p) => {
      if (!cancelled) setMaxReached(levelFromXp(p.xp) >= 100);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <section id="gameplay" className="py-20 md:py-28 relative">
      <div className="container">
        <SectionHeading
          eyebrow={t("gameplay.eyebrow")}
          titleKey="gameplay.title"
          subtitle={t("gameplay.subtitle")}
        />
        <ol className="relative mt-14 grid md:grid-cols-5 gap-6">
          <div className="hidden md:block absolute top-7 left-[10%] right-[10%] h-0.5 bg-primary" />
          {stepKeys.map((s, i) => (
            <li
              key={s.key}
              className="relative glass-card glow-border p-5 text-center animate-fade-in-up"
              style={{ animationDelay: `${i * 100}ms`, opacity: 0 }}
            >
              <div className="relative mx-auto w-14 h-14 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow mb-4">
                <s.icon className="w-6 h-6 text-primary-foreground" />
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gold text-gold-foreground text-xs font-bold grid place-items-center shadow-gold">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-semibold mb-1.5 max-sm:text-lg">{t(`gameplay.steps.${s.key}.title`)}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-sm:text-sm">
                {s.key === "unlock"
                  ? maxReached
                    ? t("gameplay.steps.unlock.maxDesc")
                    : t("gameplay.steps.unlock.desc")
                  : t(`gameplay.steps.${s.key}.desc`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default Gameplay;
