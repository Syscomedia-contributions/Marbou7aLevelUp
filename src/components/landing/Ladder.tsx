import { Crown, Star, ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LADDER_XP, levelFromXp, loadProgression } from "@/lib/progression";
import { AUTH_CHANGE_EVENT, isAuthed } from "@/lib/auth";

type Tier = { lvl: number; state: "locked" | "current" | "safe"; grand?: boolean; safe?: boolean };

/** Niveaux clés (étoile) */
const KEY_LEVELS = [20, 60];

// Logged out: a neutral list with no progress overlay — nothing to compare
// the (nonexistent) account against.
const buildTiers = (currentLevel: number, authed: boolean): Tier[] =>
  [100, 90, 80, 70, 60, 50, 40, 30, 25, 20, 15, 10, 5, 3, 1].map((lvl) => ({
    lvl,
    state: !authed ? "locked" : lvl === currentLevel ? "current" : lvl < currentLevel ? "safe" : "locked",
    grand: lvl === 100 || undefined,
    safe: KEY_LEVELS.includes(lvl) || undefined,
  }));

const Ladder = () => {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language.startsWith("fr");
  const isAr = i18n.language.startsWith("ar");
  const [currentLevel, setCurrentLevel] = useState(1);
  const [progressionLoaded, setProgressionLoaded] = useState(false);
  const [authed, setAuthed] = useState(() => isAuthed());
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const hasAutoScrolled = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const fromQuiz = location.state?.fromQuiz === true;
  const quizCategory: string | undefined = location.state?.quizCategory;

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      setAuthed(isAuthed());
      loadProgression().then((p) => {
        if (cancelled) return;
        setCurrentLevel(levelFromXp(p.xp));
        setProgressionLoaded(true);
      });
    };
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const ladderTiers = buildTiers(currentLevel, authed);

  // Scroll straight to the player's own position on the ladder once real
  // progression data has loaded — the closest tier to their current level.
  // After that the page is free to scroll normally. Guests have no position
  // to scroll to.
  useEffect(() => {
    if (hasAutoScrolled.current || !progressionLoaded || !authed) return;
    hasAutoScrolled.current = true;
    const target = ladderTiers.reduce((closest, tier) =>
      Math.abs(tier.lvl - currentLevel) < Math.abs(closest.lvl - currentLevel) ? tier : closest
    );
    const id = window.setTimeout(() => {
      rowRefs.current[target.lvl]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressionLoaded, authed]);

  return (
    <section id="ladder-section" dir={isAr ? "rtl" : "ltr"} className="pt-0 pb-20 md:pb-28 -mt-8 md:-mt-16 relative">
      <div className="container relative max-w-2xl">
        {fromQuiz && (
          <div className="mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                quizCategory
                  ? navigate(`/quiz/${quizCategory}`, { state: { showResult: true } })
                  : navigate(-1)
              }
              className="text-white hover:text-white hover:bg-white/10 -ms-2 ps-2 text-base"
            >
              <ArrowLeft className="w-5 h-5 me-2" />
              {t("quiz.backToResult")}
            </Button>
          </div>
        )}
        <div className="glass-card gold-frame p-7 relative overflow-hidden animate-fade-in-up" style={{ opacity: 0 }}>
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
          <div className="flex items-start justify-between mb-1 relative">
            <div>
              <h3 className="text-xl font-bold text-gold">{t("systems.ladderTitle")}</h3>
              <p
                className={`text-sm font-semibold text-slate-700 whitespace-nowrap ${isAr ? "flex gap-1" : ""}`}
                dir={isAr ? "ltr" : undefined}
              >
                {isAr ? (
                  <>
                    <span>{t("systems.ladderSubtitle").replace(/^\d+\s+/, "")}</span>
                    <span>{t("systems.ladderSubtitle").match(/^\d+/)?.[0]}</span>
                  </>
                ) : (
                  t("systems.ladderSubtitle")
                )}
              </p>
            </div>
            <Crown className="w-7 h-7 text-gold" />
          </div>

          <div className="mt-5 space-y-1.5 relative" dir="ltr">
            {ladderTiers.map((tier, i) => (
              <div
                key={tier.lvl}
                ref={(el) => { rowRefs.current[tier.lvl] = el; }}
                className={`tier-row ${tier.state} animate-tier-rise`}
                style={{ animationDelay: `${i * 35}ms`, opacity: 0 }}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`text-[11px] font-extrabold w-7 text-center ${tier.state === "safe" && !tier.grand ? "" : "text-slate-900"}`}>
                    {tier.lvl}
                  </span>
                  {tier.grand && <Crown className="w-3.5 h-3.5" />}
                  {tier.safe && !tier.grand && <Star className="w-3 h-3 fill-current" />}
                </div>
                <div className="flex flex-col items-end leading-tight">
                  <span
                    className={`font-bold tabular-nums ${tier.grand && (isFr || i18n.language.startsWith("en")) ? "max-sm:text-right" : ""}`}
                    dir={tier.grand ? "auto" : undefined}
                  >
                    {tier.grand
                      ? t("systems.ladderGrandJackpotLabel")
                      : tier.lvl === 1
                        ? t("systems.ladderStart")
                        : `${t("systems.ladderLevel")} ${tier.lvl}`}
                  </span>
                  <span className="text-xs font-semibold opacity-70 tabular-nums" dir="ltr">
                    {LADDER_XP[tier.lvl].toLocaleString("fr-FR").replace(/\u202f|,/g, " ")} {t("systems.ladderPts")}
                  </span>
                </div>

              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-4 text-sm font-bold text-slate-800 relative">
            <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 fill-current" style={{ color: "hsl(220 100% 40%)" }} /> {t("systems.ladderSafe")}</span>
            {authed && (
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gradient-gold" /> {t("systems.ladderCurrent")}</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Ladder;
