import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Atom, Check, GripVertical, Landmark, Pause, Play, ScrollText, Sparkles, Timer, Trophy, X, Zap, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getCategoryMeta } from "@/data/quiz/categoryMeta";
import { pickCategory, type Lang } from "@/data/quiz/translations";
import {
  BADGE_LABELS,
  loadProgression,
  saveProgression,
  POINTS_PER_CORRECT,
  POINTS_PER_WRONG,
  computeRunPoints,
  computeSpeedBonus,
  type BadgeId,
} from "@/lib/progression";
import { api } from "@/lib/api";
import { isAuthed } from "@/lib/auth";
import type { PublicQuizQuestion, GameStartResponse, AnswerResponse, FinishResponse, QuestionKind } from "@/types/quiz";

import { playQuizResultSound, unlockPortalAudio, playCorrectSound, playIncorrectSound } from "@/lib/portalSounds";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  history: ScrollText,
  archeo: Landmark,
  science: Atom,
};

const QUESTION_TIME = 20; // seconds
const PUZZLE_EXTRA_TIME = 4; // secondes bonus pour le puzzle chronologique
const TIMEOUT_GRACE_MS = 1000; // pause avant le croix rouge et la question suivante

/** Durée du minuteur selon le format de question (le puzzle a 4 s de plus). */
const questionTimeFor = (kind: QuestionKind): number =>
  kind === "puzzle" ? QUESTION_TIME + PUZZLE_EXTRA_TIME : QUESTION_TIME;

type Phase = "intro" | "playing" | "reveal" | "done";

type ResultsState = {
  leveledUp: boolean;
  newBadges: BadgeId[];
  finalXp: number;
  finalLevel: number;
  pointsEarned: number;
  levelUpBonus: number;
  speedBonus: number;
};

const QuizPlay = () => {
  const { t, i18n } = useTranslation();
  const lang: Lang = (["fr", "en", "ar"].includes(i18n.language) ? i18n.language : "fr") as Lang;
  const letterFor = (i: number, kind: string) => {
    if (kind === "truefalse") return i === 0 ? "✓" : "✗";
    if (lang === "ar") return ["أ", "ب", "ج", "د"][i] ?? String.fromCharCode(65 + i);
    return String.fromCharCode(65 + i);
  };
  const { category = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const showSavedResult = (location.state as { showResult?: boolean } | null)?.showResult === true;
  const cat = getCategoryMeta(category);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PublicQuizQuestion[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [introElapsed, setIntroElapsed] = useState(false);

  const RESULT_KEY = `marbou7a:last-result:${category}`;
  const savedSnapshot = useMemo(() => {
    if (!showSavedResult) return null;
    try {
      const raw = sessionStorage.getItem(RESULT_KEY);
      return raw ? (JSON.parse(raw) as { correct: number; wrong: number; total: number; results: ResultsState }) : null;
    } catch {
      return null;
    }
  }, [showSavedResult, RESULT_KEY]);

  const [phase, setPhase] = useState<Phase>(savedSnapshot ? "done" : "intro");
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const revealRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef<HTMLDivElement | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [puzzleOrder, setPuzzleOrder] = useState<string[]>([]);
  const [selectedPuzzleTile, setSelectedPuzzleTile] = useState<string | null>(null);
  const [draggingPuzzleTile, setDraggingPuzzleTile] = useState<string | null>(null);
  const pointerStartRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const [cluesShown, setCluesShown] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundPlaying, setSoundPlaying] = useState(false);
  const questionStartRef = useRef<number>(Date.now());
  const [speedBonus, setSpeedBonus] = useState(0);
  const [lastBonus, setLastBonus] = useState(0);
  const [pointsFlash, setPointsFlash] = useState<{ value: number; correct: boolean } | null>(null);
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [correctPairs, setCorrectPairs] = useState<Record<string, string> | null>(null);
  const [correctTileOrder, setCorrectTileOrder] = useState<string[] | null>(null);
  const [correct, setCorrect] = useState(savedSnapshot?.correct ?? 0);
  const [wrong, setWrong] = useState(savedSnapshot?.wrong ?? 0);
  const [time, setTime] = useState(QUESTION_TIME);
  const [timedOut, setTimedOut] = useState(false);
  // Seconde de pause après l'expiration du chrono : le croix rouge (et
  // l'enchaînement vers la question suivante) n'arrivent qu'ensuite.
  const [timeoutGrace, setTimeoutGrace] = useState(false);
  const timeoutGraceRef = useRef<number | null>(null);
  const [revealTime, setRevealTime] = useState(15);
  const [msgIdx, setMsgIdx] = useState(0);
  const [results, setResults] = useState<ResultsState | null>(savedSnapshot?.results ?? null);
  const [savedTotal] = useState<number | null>(savedSnapshot?.total ?? null);
  const totalQuestions = savedTotal ?? questions.length;

  const q = questions[idx];
  const qKind = q?.kind ?? "mcq";

  // Fetch a fresh server-authoritative game session for this category (answers withheld).
  useEffect(() => {
    if (!cat || savedSnapshot) return;
    let cancelled = false;
    setSessionId(null);
    setQuestions([]);
    setLoadFailed(false);
    api
      .post<GameStartResponse>("/games", { categoryKey: cat.key })
      .then((res) => {
        if (cancelled) return;
        setSessionId(res.sessionId);
        setQuestions(res.questions);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  // Cycle immersive intro messages
  useEffect(() => {
    if (phase !== "intro" || !cat) return;
    setIntroElapsed(false);
    const t = window.setInterval(
      () => setMsgIdx((i) => (i + 1) % cat.immersiveMessages.length),
      1400
    );
    const start = window.setTimeout(() => setIntroElapsed(true), 2400);
    return () => {
      clearInterval(t);
      clearTimeout(start);
    };
  }, [phase, cat]);

  // Move on once both the intro animation played out and the session is ready.
  useEffect(() => {
    if (phase === "intro" && introElapsed && questions.length > 0) {
      setPhase("playing");
    }
  }, [phase, introElapsed, questions.length]);

  // Reset per-question state when index changes
  useEffect(() => {
    setPicked(null);
    setMatches({});
    setAnsweredCorrect(null);
    setCorrectIndex(null);
    setCorrectPairs(null);
    setCorrectTileOrder(null);
    setTimedOut(false);
    setCluesShown(1);
    setLastBonus(0);
    setPointsFlash(null);
    setSelectedPuzzleTile(null);
    setDraggingPuzzleTile(null);
    questionStartRef.current = Date.now();
    // Le puzzle chronologique démarre avec 4 secondes de plus
    setTime(questionTimeFor(q?.kind ?? "mcq"));
    setPuzzleOrder((q?.puzzleTilesShuffled ?? []).map((tile) => tile.id));
  }, [idx, q]);

  const runPoints = useMemo(
    () => computeRunPoints(correct, wrong, speedBonus),
    [correct, wrong, speedBonus]
  );

  // « Reconnais le son » : lecture automatique de l'extrait à l'arrivée
  // de la question, et arrêt dès que l'on change de question.
  useEffect(() => {
    const el = audioRef.current;
    setSoundPlaying(false);
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    if (phase === "playing" && qKind === "sound") {
      el.play()
        .then(() => setSoundPlaying(true))
        .catch(() => setSoundPlaying(false));
    }
    return () => {
      el.pause();
    };
  }, [idx, phase, qKind]);

  const toggleSound = () => {
    const el = audioRef.current;
    if (!el) return;
    unlockPortalAudio();
    if (soundPlaying) {
      el.pause();
      setSoundPlaying(false);
      return;
    }
    el.currentTime = 0;
    el.play()
      .then(() => setSoundPlaying(true))
      .catch(() => setSoundPlaying(false));
  };

  // Progressive clue reveal for the « Qui suis-je ? » format
  useEffect(() => {
    if (phase !== "playing" || qKind !== "whoami") return;
    const total = q?.clues?.length ?? 0;
    if (total <= 1) return;
    const id = window.setInterval(() => {
      setCluesShown((n) => (n >= total ? n : n + 1));
    }, 3500);
    return () => clearInterval(id);
  }, [phase, idx, qKind, q]);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    setTime(questionTimeFor(qKind));
    setTimeoutGrace(false);
    const id = window.setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          clearInterval(id);
          // Timeout — report to the server too so its tally (used at finish) matches
          // what the player sees; fire-and-forget, there's ample time before `next()`.
          if (sessionId && q) {
            api
              .post(`/games/${sessionId}/answer`, {
                questionId: q.id,
                choiceIndex: null,
                timeMs: Date.now() - questionStartRef.current,
              })
              .catch(() => {});
          }
          setAnsweredCorrect(false);
          setTimedOut(true);
          setWrong((w) => w + 1);
          if (qKind !== "matching") setPicked(-1);
          setPhase("reveal");
          // Une seconde de pause avant le croix rouge et la question suivante
          setTimeoutGrace(true);
          timeoutGraceRef.current = window.setTimeout(() => {
            timeoutGraceRef.current = null;
            setTimeoutGrace(false);
            playIncorrectSound();
            setPointsFlash({ value: POINTS_PER_WRONG, correct: false });
          }, TIMEOUT_GRACE_MS);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, idx, qKind, sessionId, q]);

  // Ne jamais laisser un son ou un flash partir après la sortie du quiz
  useEffect(
    () => () => {
      if (timeoutGraceRef.current) window.clearTimeout(timeoutGraceRef.current);
    },
    []
  );

  useEffect(() => {
    if (phase === "done") {
      const total = totalQuestions || 1;
      if (!savedSnapshot) playQuizResultSound(correct / total);
      // Amener tout le panneau de résultat dans le viewport (web et mobile) :
      // centré s'il tient à l'écran, sinon aligné en haut pour ne rien couper.
      const bringResultIntoView = () => {
        const el = doneRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const headerOffset = 88;
        const available = vh - headerOffset;
        const top =
          rect.height <= available
            ? rect.top + window.scrollY - headerOffset - (available - rect.height) / 2
            : rect.top + window.scrollY - headerOffset;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      };
      const t1 = window.setTimeout(bringResultIntoView, 120);
      const t2 = window.setTimeout(bringResultIntoView, 600);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
  }, [phase, correct, totalQuestions, savedSnapshot]);

  // Persist the final result so the player can come back to it from the ladder
  useEffect(() => {
    if (phase !== "done" || !results || savedSnapshot) return;
    try {
      sessionStorage.setItem(
        RESULT_KEY,
        JSON.stringify({ correct, wrong, total: questions.length, results })
      );
    } catch {
      /* ignore */
    }
  }, [phase, results, correct, wrong, questions.length, RESULT_KEY, savedSnapshot]);

  // Auto-advance on correct answer or timeout (skip "Le savais-tu ?")
  // For wrong answers, auto-advance after 15s if user doesn't click "Question suivante"
  useEffect(() => {
    if (phase !== "reveal") return;
    // On laisse s'écouler la seconde de pause avant d'afficher le croix rouge
    // et de passer à la question suivante.
    if (timeoutGrace) return;
    if (answeredCorrect === true || timedOut) {
      const delay = timedOut ? 1400 : 900;
      const t = window.setTimeout(() => next(), delay);
      return () => clearTimeout(t);
    }
    if (answeredCorrect === false) {
      // Smooth scroll to the "Le savais-tu ?" reveal panel
      window.setTimeout(() => {
        revealRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      // Pas de timer sur la dernière question — l'utilisateur lit le résultat à son rythme
      if (idx + 1 >= questions.length) return;
      setRevealTime(15);
      const id = window.setInterval(() => {
        setRevealTime((t) => {
          if (t <= 1) {
            clearInterval(id);
            next();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, answeredCorrect, picked, timedOut, timeoutGrace, idx, questions.length]);

  if (!cat) {
    return (
      <div className="container py-24 text-center">
        <p className="text-muted-foreground">{t("quiz.notFound")}</p>
        <Button asChild className="mt-4"><Link to="/portal">{t("quiz.return")}</Link></Button>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="container py-24 text-center">
        <p className="text-muted-foreground">{t("quiz.notFound")}</p>
        <Button asChild className="mt-4"><Link to="/portal">{t("quiz.return")}</Link></Button>
      </div>
    );
  }

  const theme = cat.theme;
  const categoryColor = `hsl(${theme.primary})`;
  const catT = pickCategory(cat.key, lang) ?? {
    name: cat.name,
    tagline: cat.tagline,
    immersiveMessages: cat.immersiveMessages,
  };
  const qT = q
    ? ((lang !== "fr" ? q.translations?.[lang] : undefined) ?? {
        sub: q.subcategory,
        q: q.question,
        c: q.choices,
        cl: q.clues,
        pt: q.puzzleTilesShuffled?.map((tile) => tile.label),
        f: q.funFact,
      })
    : null;

  const whoamiClues: string[] = (qT?.cl ?? q?.clues) ?? [];
  // Labels indexed the same way as `puzzleOrder`/`q.puzzleTilesShuffled` (server-shuffled order).
  const puzzleLabelFor = (tileId: string) => {
    const shuffledIndex = q?.puzzleTilesShuffled?.findIndex((tile) => tile.id === tileId) ?? -1;
    return (qT?.pt?.[shuffledIndex]) ?? q?.puzzleTilesShuffled?.[shuffledIndex]?.label ?? "";
  };

  const movePuzzleTile = (sourceId: string, targetId: string) => {
    if (phase !== "playing" || sourceId === targetId) return;
    setPuzzleOrder((order) => {
      const from = order.indexOf(sourceId);
      const to = order.indexOf(targetId);
      if (from < 0 || to < 0) return order;
      const nextOrder = [...order];
      const [moved] = nextOrder.splice(from, 1);
      nextOrder.splice(to, 0, moved);
      return nextOrder;
    });
  };

  const movePuzzleBy = (tileId: string, delta: number) => {
    const index = puzzleOrder.indexOf(tileId);
    const target = puzzleOrder[index + delta];
    if (index < 0 || !target) return;
    movePuzzleTile(tileId, target);
  };

  const handlePuzzleTileClick = (tileId: string) => {
    if (phase !== "playing") return;
    if (!selectedPuzzleTile) {
      setSelectedPuzzleTile(tileId);
      return;
    }
    movePuzzleTile(selectedPuzzleTile, tileId);
    setSelectedPuzzleTile(null);
  };

  const handlePuzzlePointerDown = (tileId: string, event: React.PointerEvent) => {
    if (phase !== "playing") return;
    pointerStartRef.current = { id: tileId, x: event.clientX, y: event.clientY };
    setDraggingPuzzleTile(tileId);
  };

  const handlePuzzlePointerUp = (event: React.PointerEvent) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    setDraggingPuzzleTile(null);
    if (!start) return;
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-puzzle-tile]");
    const targetId = target?.dataset.puzzleTile;
    if (distance > 8 && targetId) {
      movePuzzleTile(start.id, targetId);
      setSelectedPuzzleTile(null);
    }
  };

  const pick = async (i: number) => {
    if (phase !== "playing" || picked !== null || !q || !sessionId) return;
    // Keep the shared AudioContext alive on every tap so the end-of-quiz
    // jingle (fired later from a timer) can still play on mobile.
    unlockPortalAudio();
    setPicked(i);
    try {
      const res = await api.post<AnswerResponse>(`/games/${sessionId}/answer`, {
        questionId: q.id,
        choiceIndex: i,
        timeMs: Date.now() - questionStartRef.current,
      });
      setCorrectIndex(res.correctIndex);
      setAnsweredCorrect(res.isCorrect);
      if (res.isCorrect) {
        setCorrect((c) => c + 1);
        if (res.speedBonus > 0) {
          setLastBonus(res.speedBonus);
          setSpeedBonus((b) => b + res.speedBonus);
        }
        playCorrectSound();
        setPointsFlash({ value: POINTS_PER_CORRECT, correct: true });
      } else {
        setWrong((w) => w + 1);
        playIncorrectSound();
        setPointsFlash({ value: POINTS_PER_WRONG, correct: false });
      }
    } catch {
      setAnsweredCorrect(false);
      setWrong((w) => w + 1);
      playIncorrectSound();
      setPointsFlash({ value: POINTS_PER_WRONG, correct: false });
    } finally {
      setPhase("reveal");
    }
  };

  const submitMatching = async () => {
    if (phase !== "playing" || !q?.matchingLeft || !sessionId) return;
    if (q.matchingLeft.some((left) => !matches[left])) return; // not all assigned
    unlockPortalAudio();
    try {
      const res = await api.post<AnswerResponse>(`/games/${sessionId}/answer`, {
        questionId: q.id,
        matches,
        timeMs: Date.now() - questionStartRef.current,
      });
      setCorrectPairs(
        res.correctPairs ? Object.fromEntries(res.correctPairs.map((p) => [p.left, p.right])) : null
      );
      setAnsweredCorrect(res.isCorrect);
      if (res.isCorrect) {
        setCorrect((c) => c + 1);
        playCorrectSound();
        setPointsFlash({ value: POINTS_PER_CORRECT, correct: true });
      } else {
        setWrong((w) => w + 1);
        playIncorrectSound();
        setPointsFlash({ value: POINTS_PER_WRONG, correct: false });
      }
    } catch {
      setAnsweredCorrect(false);
      setWrong((w) => w + 1);
      playIncorrectSound();
      setPointsFlash({ value: POINTS_PER_WRONG, correct: false });
    } finally {
      setPhase("reveal");
    }
  };

  const submitPuzzle = async () => {
    if (phase !== "playing" || !q?.puzzleTilesShuffled || puzzleOrder.length !== q.puzzleTilesShuffled.length || !sessionId) return;
    unlockPortalAudio();
    setPicked(0);
    try {
      const res = await api.post<AnswerResponse>(`/games/${sessionId}/answer`, {
        questionId: q.id,
        tileOrder: puzzleOrder,
        timeMs: Date.now() - questionStartRef.current,
      });
      setCorrectTileOrder(res.correctTileOrder);
      setAnsweredCorrect(res.isCorrect);
      if (res.isCorrect) {
        setCorrect((c) => c + 1);
        playCorrectSound();
        setPointsFlash({ value: POINTS_PER_CORRECT, correct: true });
      } else {
        setWrong((w) => w + 1);
        playIncorrectSound();
        setPointsFlash({ value: POINTS_PER_WRONG, correct: false });
      }
    } catch {
      setAnsweredCorrect(false);
      setWrong((w) => w + 1);
      playIncorrectSound();
      setPointsFlash({ value: POINTS_PER_WRONG, correct: false });
    } finally {
      setPhase("reveal");
    }
  };

  const next = async () => {
    // Annule une éventuelle pause en cours avant d'enchaîner
    if (timeoutGraceRef.current) {
      window.clearTimeout(timeoutGraceRef.current);
      timeoutGraceRef.current = null;
    }
    setTimeoutGrace(false);
    if (idx + 1 >= questions.length) {
      if (!sessionId) {
        setPhase("done");
        return;
      }
      try {
        const authed = isAuthed();
        const prevLocal = authed ? null : await loadProgression();
        const res = await api.post<FinishResponse>(
          `/games/${sessionId}/finish`,
          authed ? undefined : { guestProgression: prevLocal }
        );
        if (!authed && prevLocal) {
          saveProgression({
            ...prevLocal,
            xp: res.progression.xp,
            level: res.progression.level,
            badges: res.progression.badges as BadgeId[],
            perCategory: res.progression.perCategory,
          });
        }
        setResults({
          leveledUp: res.leveledUp,
          newBadges: res.newBadges as BadgeId[],
          finalXp: res.finalXp,
          finalLevel: res.finalLevel,
          pointsEarned: res.pointsEarned,
          levelUpBonus: res.levelUpBonus,
          speedBonus: res.speedBonus,
        });
      } catch {
        const fallback = await loadProgression().catch(() => null);
        setResults({
          leveledUp: false,
          newBadges: [],
          finalXp: fallback?.xp ?? 0,
          finalLevel: fallback?.level ?? 1,
          pointsEarned: 0,
          levelUpBonus: 0,
          speedBonus: 0,
        });
      }
      setPhase("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setIdx((i) => i + 1);
    setPhase("playing");
    // Scroll after the new question has rendered so the page height is settled
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 60);
  };

  const CatIcon = CATEGORY_ICON[cat.key];
  const accent = `hsl(${theme.accent})`;
  const primary = `hsl(${theme.primary})`;

  const showReveal = phase === "reveal";
  const matchingComplete = qKind === "matching" && q?.matchingLeft && q.matchingLeft.every((left) => !!matches[left]);

  return (
    <div
      className={`quiz-abydos quiz-abydos--${cat.key} min-h-screen min-h-[100dvh] relative overflow-hidden text-white -mt-20 pt-20`}
      style={{ "--quiz-category-color": theme.primary } as CSSProperties}
    >
      {/* Décor : même monde que le Portail, vu depuis le désert après la traversée (fond géré par Layout.tsx) */}
      <div className="quiz-abydos__arrival" aria-hidden />
      <div className="quiz-abydos__wash" aria-hidden />
      <div className="quiz-abydos__torch" aria-hidden />
      <div className="quiz-abydos__dust" aria-hidden>
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 53) % 100}%`,
              animationDelay: `${(i % 7) * 1.3}s`,
              animationDuration: `${14 + (i % 5) * 3}s`,
            }}
          />
        ))}
      </div>
      {phase === "playing" && (
        <div key={`gate-${idx}`} className="quiz-abydos__activate" aria-hidden />
      )}

      <div className="container relative z-10 py-8 md:py-14 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" asChild className="quiz-portal-back relative z-[60] text-white/80 hover:text-white hover:bg-white/10 text-base">
            <Link to="/portal"><ArrowLeft className="w-5 h-5 me-2" /> {t("quiz.back")}</Link>
          </Button>
          <div className="flex items-center gap-2 text-lg md:text-xl font-bold">
            {CatIcon ? (
              <CatIcon className="w-7 h-7 md:w-8 md:h-8" style={{ color: categoryColor }} aria-hidden />
            ) : (
              <span className="text-3xl leading-none">{cat.emoji}</span>
            )}
            <span>{catT.name}</span>
          </div>
        </div>

        {phase === "intro" && (
          <div className="grid place-items-center min-h-[60vh] text-center animate-fade-in">
            <div className="space-y-6">
              {CatIcon ? (
                <CatIcon
                  className="mx-auto w-24 h-24 md:w-28 md:h-28"
                  style={{ color: categoryColor, filter: `drop-shadow(0 0 30px ${categoryColor})` }}
                  aria-hidden
                />
              ) : (
                <div className="text-7xl md:text-8xl">{cat.emoji}</div>
              )}
              <h1 className="text-4xl md:text-5xl font-black text-white" style={{ textShadow: `0 0 30px ${categoryColor}` }}>
                {catT.name}
              </h1>
              <p className="text-white/70 italic">{catT.tagline}</p>
              <div
                key={msgIdx}
                className="quiz-intro-pill inline-flex items-center gap-2 px-5 py-3 rounded-full border bg-white/5 backdrop-blur animate-fade-in text-white"
                style={{ borderColor: categoryColor }}
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span className="font-mono text-sm tracking-wider">
                  {catT.immersiveMessages[msgIdx % catT.immersiveMessages.length]}
                </span>
              </div>
            </div>
          </div>
        )}

        {(phase === "playing" || phase === "reveal") && q && (
          <div className="space-y-6 animate-fade-in relative">
            {/* Timeout red X overlay — affiché seulement après la seconde de pause */}
            {timedOut && phase === "reveal" && !timeoutGrace && (
              <div className="fixed inset-0 z-50 grid place-items-center pointer-events-none animate-fade-in" aria-hidden>
                <div className="relative animate-scale-in">
                  <X
                    className="w-48 h-48 md:w-64 md:h-64 text-red-500"
                    strokeWidth={3}
                    style={{ filter: "drop-shadow(0 0 30px rgba(239,68,68,0.9)) drop-shadow(0 0 60px rgba(239,68,68,0.6))" }}
                  />
                </div>
              </div>
            )}
            {/* Points flash (+500 / +50) */}
            {showReveal && pointsFlash && (
              <div className={`points-flash ${pointsFlash.correct ? "points-flash--correct" : "points-flash--wrong"}`} aria-hidden>
                <div className="points-flash__pill">
                  {pointsFlash.correct ? <Check className="points-flash__icon" /> : <X className="points-flash__icon" />}
                  +{pointsFlash.value}
                </div>
              </div>
            )}
            {/* Bonus de rapidité gagné */}
            {showReveal && lastBonus > 0 && (
              <div className="fixed inset-x-0 top-24 z-50 grid place-items-center pointer-events-none animate-scale-in" aria-hidden>
                <div className="quiz-speed-bonus px-5 py-2 rounded-full border-2 font-black text-lg backdrop-blur">
                  ⚡ +{lastBonus} {t("quiz.xpSuffix")} · {t("quiz.speedBonus")}
                </div>
              </div>
            )}

            {/* Progress bar */}
            <div className="space-y-2">
              <div
                dir="ltr"
                className={`flex items-center justify-between text-xs uppercase tracking-widest text-white/60 ${lang === "ar" ? "flex-row-reverse" : ""}`}
              >
                <span dir="ltr" className={`text-white font-bold ${lang === "ar" ? "flex flex-row-reverse items-center gap-1 text-[1.02rem] md:text-[1.13rem] normal-case tracking-normal" : ""}`}>
                  <span dir={lang === "ar" ? "rtl" : undefined} className={lang === "ar" ? undefined : "mr-1.5"}>
                    {t("quiz.question")}
                  </span>
                  <span dir="ltr" className="inline-flex items-center gap-1">
                    <span className="text-white">{idx + 1}</span>
                    <span className="text-primary">/</span>
                    <span className="text-primary">{questions.length}</span>
                  </span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0 text-[0.95rem] font-bold normal-case tracking-normal tabular-nums text-white px-2.5 py-1 rounded-full border border-white/20 bg-black/30">
                  <Timer className="w-4 h-4 shrink-0" /> {time}s
                </span>
              </div>
              <Progress value={((idx + (answeredCorrect !== null ? 1 : 0)) / questions.length) * 100} className="quiz-category-progress h-1.5 bg-white/10" />
              <div className="h-1 rounded-full overflow-hidden bg-white/10" aria-label="time-left">
                <div
                  className="h-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${(time / questionTimeFor(qKind)) * 100}%`,
                    background: time > 5 ? "white" : "hsl(0 90% 60%)",
                  }}
                />
              </div>
            </div>

            {/* Question card */}
            <div
              className="quiz-panel rounded-3xl p-5 sm:p-6 md:p-8 border backdrop-blur-md"
              style={{
                background: `linear-gradient(180deg, hsl(${theme.bgFrom} / 0.6), hsl(${theme.bgTo} / 0.6))`,
                borderColor: categoryColor,
                boxShadow: `0 0 60px hsl(${theme.primary} / 0.2)`,
              }}
            >
              <div
                dir="ltr"
                className={`flex items-center gap-2 mb-4 uppercase tracking-widest ${lang === "ar" ? "flex-row-reverse text-sm md:text-base normal-case tracking-normal" : "text-xs"}`}
              >
                <span className={`font-bold text-white whitespace-nowrap first:ps-0 ${lang === "ar" ? "text-[0.97rem] md:text-[1.08rem]" : ""}`}>
                  {qT?.sub ?? q.subcategory}
                </span>
                <span className="text-white/30" aria-hidden>·</span>
                <span dir="ltr" className={`font-bold text-white whitespace-nowrap ${lang === "ar" ? "text-[0.85rem] md:text-[0.97rem]" : ""}`}>
                  +{POINTS_PER_CORRECT} {t("quiz.xpSuffix")}
                </span>
                {qKind !== "mcq" && qKind !== "truefalse" && qKind !== "image" && qKind !== "whoami" && qKind !== "sound" && (
                  <>
                    <span className="text-white/30" aria-hidden>·</span>
                    <span className="font-bold text-white/80 whitespace-nowrap">
                      {t(`quiz.kinds.${qKind}`)}
                    </span>
                  </>
                )}
              </div>

              {/* Image visual for image-kind */}
              {qKind === "image" && (
                <div
                  className="mb-5 rounded-2xl overflow-hidden border bg-[hsl(215_70%_12%/0.35)] grid place-items-center min-h-[160px] p-4"
                  style={{ borderColor: `hsl(${theme.primary} / 0.45)` }}
                >
                  {q.imageUrl ? (
                    <img
                      src={q.imageUrl}
                      alt={q.question}
                      className="max-h-56 w-auto object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.15)]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-8xl md:text-9xl leading-none" aria-hidden>
                      {q.imageEmoji ?? "🖼️"}
                    </div>
                  )}
                </div>
              )}

              <h2
                dir={lang === "ar" ? "rtl" : undefined}
                className={`text-xl md:text-2xl font-bold leading-snug mb-6 ${lang === "ar" ? "[unicode-bidi:plaintext] text-right" : ""}`}
              >
                {qT?.q ?? q.question}
              </h2>

              {/* Puzzle chronologique — glisser, toucher deux carreaux ou utiliser les flèches */}
              {qKind === "puzzle" && q.puzzleTilesShuffled && (
                <div className="quiz-puzzle" dir={lang === "ar" ? "rtl" : "ltr"}>
                  <p className="quiz-puzzle__hint">{t("quiz.puzzleHint")}</p>
                  <div className="quiz-puzzle__grid" role="list" aria-label={qT?.q ?? q.question}>
                    {puzzleOrder.map((tileId, position) => {
                      const tile = q.puzzleTilesShuffled?.find((tl) => tl.id === tileId);
                      if (!tile) return null;
                      const correctIndexForTile = correctTileOrder?.indexOf(tileId) ?? -1;
                      const isCorrectPosition = showReveal && correctIndexForTile === position;
                      const resultClass = showReveal
                        ? (isCorrectPosition ? "is-correct" : "is-incorrect")
                        : selectedPuzzleTile === tileId ? "is-selected" : "";
                      return (
                        <div
                          key={tileId}
                          role="listitem"
                          data-puzzle-tile={tileId}
                          className={`quiz-puzzle__tile ${resultClass} ${draggingPuzzleTile === tileId ? "is-dragging" : ""}`}
                          onClick={() => handlePuzzleTileClick(tileId)}
                          onPointerDown={(event) => handlePuzzlePointerDown(tileId, event)}
                          onPointerUp={handlePuzzlePointerUp}
                          onPointerCancel={() => {
                            pointerStartRef.current = null;
                            setDraggingPuzzleTile(null);
                          }}
                        >
                          <span className="quiz-puzzle__position" aria-label={`${position + 1}`}>{position + 1}</span>
                          <div
                            className={`quiz-puzzle__image quiz-puzzle__image--${tile.imagePosition}`}
                            style={{ backgroundImage: `url(${tile.imageUrl})` }}
                            role="img"
                            aria-label={puzzleLabelFor(tileId)}
                          />
                          <div className="quiz-puzzle__caption">
                            <GripVertical className="quiz-puzzle__grip" aria-hidden />
                            <span>{puzzleLabelFor(tileId)}</span>
                          </div>
                          {phase === "playing" && (
                            <div className="quiz-puzzle__moves">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={(event) => { event.stopPropagation(); movePuzzleBy(tileId, -1); }}
                                disabled={position === 0}
                                aria-label={lang === "ar" ? "نقل إلى الموضع السابق" : t("quiz.puzzleMoveEarlier")}
                              >
                                {lang === "ar" ? <ArrowRight /> : <ArrowLeft />}
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={(event) => { event.stopPropagation(); movePuzzleBy(tileId, 1); }}
                                disabled={position === puzzleOrder.length - 1}
                                aria-label={lang === "ar" ? "نقل إلى الموضع التالي" : t("quiz.puzzleMoveLater")}
                              >
                                {lang === "ar" ? <ArrowLeft /> : <ArrowRight />}
                              </Button>
                            </div>
                          )}
                          {showReveal && (
                            isCorrectPosition
                              ? <Check className="quiz-puzzle__status text-quiz-correct" aria-hidden />
                              : <X className="quiz-puzzle__status text-quiz-incorrect" aria-hidden />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {showReveal && answeredCorrect === false && correctTileOrder && (
                    <div className="quiz-puzzle__correct-order">
                      <strong>{t("quiz.puzzleCorrectOrder")} :</strong>
                      <ol>
                        {correctTileOrder.map((tileId) => <li key={tileId}>{puzzleLabelFor(tileId)}</li>)}
                      </ol>
                    </div>
                  )}
                  {phase === "playing" && (
                    <Button type="button" size="lg" className="quiz-puzzle__submit" onClick={submitPuzzle}>
                      {t("quiz.validatePuzzle")}
                    </Button>
                  )}
                </div>
              )}

              {/* « Reconnais le son » — platine avec disque qui tourne */}
              {qKind === "sound" && q.audioUrl && (
                <div
                  className={`sound-deck mb-4 ${soundPlaying ? "is-playing" : ""}`}
                  style={{ "--sound-accent": accent, "--sound-primary": `${primary}33` } as CSSProperties}
                >
                  <audio
                    ref={audioRef}
                    src={q.audioUrl}
                    preload="auto"
                    onEnded={() => setSoundPlaying(false)}
                    onPause={() => setSoundPlaying(false)}
                  >
                    {t("quiz.sound.unsupported")}
                  </audio>

                  <button
                    type="button"
                    onClick={toggleSound}
                    className="sound-deck__disc cursor-pointer"
                    aria-label={soundPlaying ? t("quiz.sound.playing") : t("quiz.sound.play")}
                  >
                    <span className="sound-deck__shine" aria-hidden />
                  </button>

                  <div className="sound-deck__side">
                    <span className="sound-deck__label">🎧 {t("quiz.sound.track")}</span>
                    <div className="sound-deck__wave" aria-hidden>
                      {Array.from({ length: 22 }).map((_, i) => (
                        <span key={i} style={{ animationDelay: `${(i % 7) * 0.09}s` }} />
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={toggleSound}
                        className="font-bold border-0"
                        style={{ background: "linear-gradient(135deg, hsl(217 91% 60%), hsl(187 85% 53%))", color: "white" }}
                      >
                        {soundPlaying ? (
                          <><Pause className="w-4 h-4 me-1" /> {t("quiz.sound.playing")}</>
                        ) : (
                          <><Play className="w-4 h-4 me-1" /> {t("quiz.sound.replay")}</>
                        )}
                      </Button>
                    </div>
                    {phase === "playing" && (
                      <span className="quiz-speed-bonus-text inline-flex items-center gap-1 text-sm font-bold">
                        <Zap className="w-4 h-4" />
                        {t("quiz.speedBonus")} : +{computeSpeedBonus(time, QUESTION_TIME)} {t("quiz.xpSuffix")}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* « Qui suis-je ? » — cartes d'indices holographiques */}
              {qKind === "whoami" && whoamiClues.length > 0 && (
                <div className="whoami-orbit mb-3 sm:mb-4" style={{ "--whoami-accent": accent, "--whoami-primary": primary } as CSSProperties}>
                  <div className="whoami-orbit__rings" aria-hidden>
                    <span />
                    <span />
                  </div>
                  <div className="whoami-orbit__core" aria-hidden />

                  {whoamiClues.map((clue, i) => {
                    const activeIndex = Math.min((showReveal ? whoamiClues.length : cluesShown) - 1, whoamiClues.length - 1);
                    const isActive = i === activeIndex;
                    const isRevealed = i <= activeIndex;
                    return (
                      <div
                        key={i}
                        className={`whoami-orbit__card whoami-orbit__card--${i + 1} ${isActive ? "is-active" : i < activeIndex ? "is-before" : "is-after"}`}
                        aria-hidden={!isActive}
                      >
                        <span className="whoami-orbit__scan" aria-hidden />
                        <div className="whoami-orbit__card-head">
                          <span aria-hidden />
                          <span className="whoami-orbit__signal" aria-hidden />
                        </div>
                        <div className="whoami-orbit__label">
                          {t("quiz.clue")} {i + 1}
                        </div>
                        <p
                          dir={lang === "ar" ? "rtl" : undefined}
                          className={lang === "ar" ? "[unicode-bidi:plaintext] text-right" : undefined}
                        >
                          {isRevealed ? clue : "••••••••••••"}
                        </p>
                      </div>
                    );
                  })}

                  <div className="whoami-orbit__platform" aria-hidden>
                    <span />
                  </div>

                  {phase === "playing" && (
                    <div className="whoami-orbit__bonus quiz-speed-bonus-text">
                      <Zap className="w-5 h-5" />
                      <span>{t("quiz.speedBonus")} : +{computeSpeedBonus(time, QUESTION_TIME)} {t("quiz.xpSuffix")}</span>
                    </div>
                  )}
                </div>
              )}

              {/* MCQ / Image / True-False / Whoami / Sound */}
              {qKind !== "matching" && qKind !== "puzzle" && q.choices && (
                <div className={`grid gap-3 ${qKind === "truefalse" ? "grid-cols-2" : ""}`}>
                  {(qT?.c ?? q.choices).map((c, i) => {
                    const isAnswer = i === correctIndex;
                    const isPicked = i === picked;
                    const showResult = showReveal && picked !== null && picked >= 0;
                    let style: React.CSSProperties = {};
                    if (!showResult && isPicked) {
                      style = { borderColor: categoryColor, background: `${primary}33` };
                    }
                    const resultClassName = showResult && isAnswer
                      ? `quiz-answer--correct${picked !== correctIndex ? " quiz-answer--correct-revealed" : ""}`
                      : showResult && isPicked && !isAnswer
                        ? "quiz-answer--incorrect"
                        : "bg-white/5";
                    const sizeClass = qKind === "truefalse" ? "py-6 text-lg justify-center" : "py-3";
                    return (
                      <button
                        key={i}
                        onClick={() => pick(i)}
                        disabled={phase !== "playing"}
                        dir={lang === "ar" ? "rtl" : undefined}
                        className={`quiz-answer rounded-2xl border-2 px-4 font-semibold transition-all hover:scale-[1.01] cursor-pointer disabled:cursor-default flex items-center justify-between gap-3 ${lang === "ar" ? "quiz-answer--rtl text-right" : "text-left"} ${sizeClass} ${resultClassName}`}
                        style={style}
                      >
                        <span className={`flex items-center gap-3 ${lang === "ar" ? "flex-1 text-right" : ""}`}>
                          <span
                            className="quiz-answer__letter grid place-items-center w-7 h-7 rounded-full text-xs font-black border"
                            style={!showResult || (!isAnswer && !isPicked) ? { borderColor: categoryColor } : undefined}
                          >
                            {letterFor(i, qKind)}
                          </span>
                          <span>{c}</span>
                        </span>
                        {showResult && isAnswer && <Check className="w-5 h-5 text-quiz-correct" />}
                        {showResult && isPicked && !isAnswer && <X className="w-5 h-5 text-quiz-incorrect" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Matching */}
              {qKind === "matching" && q.matchingLeft && (
                <div className="space-y-3">
                  {q.matchingLeft.map((left) => {
                    const selected = matches[left];
                    const correctRight = correctPairs?.[left];
                    const isCorrect = showReveal && !!correctRight && selected === correctRight;
                    const isWrong = showReveal && !!correctRight && !!selected && selected !== correctRight;
                    const borderColor = isCorrect
                      ? "border-quiz-correct"
                      : isWrong
                        ? "border-quiz-incorrect"
                        : "";
                    return (
                      <div
                        key={left}
                        className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-2xl border-2 bg-white/5 ${borderColor}`}
                        style={!isCorrect && !isWrong ? { borderColor: `hsl(${theme.primary} / 0.45)` } : undefined}
                      >
                        <div className="flex-1 font-semibold">{left}</div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-white/50 hidden sm:block" />
                          <select
                            value={selected ?? ""}
                            onChange={(e) => setMatches((m) => ({ ...m, [left]: e.target.value }))}
                            disabled={phase !== "playing"}
                            className="flex-1 sm:flex-none bg-white/10 border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2"
                            style={{ minWidth: 160, borderColor: `hsl(${theme.primary} / 0.45)` }}
                          >
                            <option value="" disabled>{t("quiz.choose")}</option>
                            {(q.matchingRightShuffled ?? []).map((r) => (
                              <option key={r} value={r} className="text-foreground">{r}</option>
                            ))}
                          </select>
                          {showReveal && isCorrect && <Check className="w-5 h-5 text-quiz-correct" />}
                          {showReveal && isWrong && correctRight && (
                            <span className="text-xs text-quiz-incorrect font-semibold">✗ {correctRight}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {phase === "playing" && (
                    <Button
                      onClick={submitMatching}
                      disabled={!matchingComplete}
                      size="lg"
                      className="w-full font-bold mt-2"
                      style={{ background: primary, color: "white" }}
                    >
                      {t("quiz.validateMatching")}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Reveal panel */}
            {showReveal && answeredCorrect === false && picked !== -1 && (
              <div
                ref={revealRef}
                className="quiz-reveal-panel rounded-2xl p-5 border animate-fade-in space-y-4 scroll-mt-24"
                style={{ borderColor: categoryColor }}
              >
                <div className={`flex items-center justify-between gap-2 py-0.5 ${lang === "ar" ? "flex-row-reverse" : ""}`}>
                  <div dir={lang === "ar" ? "rtl" : undefined} className="flex items-center gap-2 font-bold text-white">
                    <Sparkles className="w-4 h-4" /> {t("quiz.didYouKnow")}
                  </div>
                  {idx + 1 < questions.length && (
                    <div dir={lang === "ar" ? "rtl" : undefined} className="flex items-center gap-1.5 shrink-0 text-[0.95rem] font-bold font-mono tabular-nums px-3 py-1.5 rounded-full border border-white/25 bg-white/10 text-white">
                      <Timer className="w-4 h-4 shrink-0" /> {revealTime}s
                    </div>
                  )}
                </div>
                <p
                  dir={lang === "ar" ? "rtl" : undefined}
                  className={`text-white/85 leading-relaxed ${lang === "ar" ? "[unicode-bidi:plaintext] text-right" : ""}`}
                >
                  {qT?.f ?? q.funFact}
                </p>
                <Button
                  onClick={() => { next(); }}
                  size="lg"
                  className="w-full font-bold"
                  style={{ background: categoryColor, color: "white" }}
                >
                  {idx + 1 >= questions.length ? t("quiz.seeResults") : t("quiz.nextQuestion")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}

        {phase === "done" && results && (
          <div ref={doneRef} className="text-center space-y-6 animate-fade-in py-10 scroll-mt-24">
            <div className="text-6xl">{correct === 0 ? "😞" : correct === totalQuestions ? "🏆" : "💎"}</div>
            <h2 className="text-3xl md:text-4xl font-black font-bold text-white" style={{ textShadow: `0 0 14px ${categoryColor}, 0 0 32px ${categoryColor}` }}>
              <strong>{correct === totalQuestions ? t("quiz.perfect") : t("quiz.finished")}</strong>
            </h2>

            {/* Score de cette partie */}
            <div className="space-y-3">
              <div className={`text-sm uppercase tracking-widest text-white/70 ${lang === "ar" ? "normal-case tracking-normal font-bold" : ""}`}>{t("quiz.runScore")}</div>
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                <div className="rounded-2xl p-4 border quiz-result-card" style={{ borderColor: categoryColor }}>
                  <div className="text-2xl font-black" style={{ color: categoryColor }}>{correct}/{totalQuestions}</div>
                  <div className={`text-white ${lang === "ar" ? "text-base md:text-sm normal-case tracking-normal font-bold" : "text-xs uppercase tracking-wider"}`}>{t("quiz.correctLabel")}</div>
                </div>
                <div className="rounded-2xl p-4 border quiz-result-card" style={{ borderColor: categoryColor }}>
                  <div className="text-2xl font-black flex items-center justify-center gap-1" style={{ color: categoryColor }}>
                    <Zap className="w-5 h-5" />{runPoints}
                  </div>
                  <div className={`text-white ${lang === "ar" ? "text-base md:text-sm normal-case tracking-normal font-bold" : "text-xs uppercase tracking-wider"}`}>{t("quiz.gainedThisRun")}</div>
                </div>
              </div>
            </div>

            {/* Progression cumulée */}
            <div className="space-y-3">
              <div className={`text-sm uppercase tracking-widest text-white/70 ${lang === "ar" ? "normal-case tracking-normal font-bold" : ""}`}>{t("quiz.totalProgress")}</div>
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                <div className="rounded-2xl p-4 border quiz-result-card quiz-result-card--level">
                  {/* Dégradé doré identique au palier courant de l'échelle de progression */}
                  <svg aria-hidden="true" focusable="false" className="absolute h-0 w-0">
                    <defs>
                      <linearGradient id="quiz-gold-gradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="hsl(43 96% 60%)" />
                        <stop offset="50%" stopColor="hsl(38 95% 50%)" />
                        <stop offset="100%" stopColor="hsl(48 100% 68%)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="text-2xl font-black flex items-center justify-center gap-1 quiz-level-value">
                    <Trophy className="w-5 h-5 quiz-level-icon" />{results.finalLevel}
                  </div>
                  <div className={`quiz-level-label text-white ${lang === "ar" ? "text-base md:text-sm normal-case tracking-normal font-bold" : "text-xs uppercase tracking-wider"}`}>{t("quiz.levelLabel")}</div>
                </div>
                <div className="rounded-2xl p-4 border quiz-result-card" style={{ borderColor: categoryColor }}>
                  <div className="text-2xl font-black flex items-center justify-center gap-1" style={{ color: categoryColor }}>
                    <Sparkles className="w-5 h-5" />{results.finalXp.toLocaleString()}
                  </div>
                  <div className={`text-white ${lang === "ar" ? "text-base md:text-sm normal-case tracking-normal font-bold" : "text-xs uppercase tracking-wider"}`}>{t("quiz.totalXp")}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 text-sm font-bold">
              {(results.speedBonus ?? speedBonus) > 0 && (
                <span className="quiz-speed-bonus px-3 py-1.5 rounded-full border-2 font-bold">
                  ⚡ {t("quiz.speedBonus")} +{results.speedBonus ?? speedBonus} {t("quiz.xpSuffix")}
                </span>
              )}
              {results.levelUpBonus > 0 && (
                <span className="px-3 py-1.5 rounded-full border-2 border-yellow-300 text-yellow-300">
                  🚀 {t("systems.values.completed")}
                </span>
              )}
            </div>

            {results.leveledUp && (
              <div className="inline-block relative px-5 py-3 rounded-full border-2 border-transparent font-black uppercase tracking-widest animate-pulse quiz-levelup-banner">
                <span className="quiz-levelup-emoji">🎉</span>{" "}
                <span className="quiz-levelup-text">{t("quiz.levelUp", { n: results.finalLevel })}</span>
              </div>
            )}

            {results.newBadges.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm uppercase tracking-widest text-white">{t("quiz.newBadges")}</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {results.newBadges.map((b) => (
                    <span key={b} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 font-semibold text-sm">
                      {BADGE_LABELS[b].emoji} {BADGE_LABELS[b].label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button
                variant="hero"
                size="lg"
                onClick={() => navigate("/prizes#current-level", { state: { fromQuiz: true, quizCategory: category } })}
                className="font-bold text-lg py-6 px-8 rounded-full transition-all hover:scale-105 hover:-translate-y-0.5 active:scale-95"
              >
                <Trophy className="w-5 h-5 mr-2" />
                {t("quiz.viewRanking")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizPlay;
