// Server-side port of the frontend's src/lib/progression.ts scoring rules.
// This is the authoritative copy — the frontend keeps the same constants purely
// for client-side display math, never for computing a score that gets persisted.

export const POINTS_PER_CORRECT = 500;
export const POINTS_PER_WRONG = 50;
export const LEVEL_UP_BONUS = 1000;

/** Bonus de rapidité maximal par question « whoami »/« sound ». */
export const SPEED_BONUS_MAX = 500;
/** Durée allouée par question, en ms (doit rester synchronisée avec QUESTION_TIME côté frontend). */
export const QUESTION_TIME_MS = 20_000;

/** Bonus de rapidité selon le temps écoulé (plus vite = plus de points). Jamais fourni par le client. */
export const computeSpeedBonus = (elapsedMs, totalMs = QUESTION_TIME_MS) => {
  if (totalMs <= 0 || typeof elapsedMs !== "number" || elapsedMs < 0) return 0;
  const timeLeftMs = Math.max(0, totalMs - elapsedMs);
  return Math.round(SPEED_BONUS_MAX * Math.min(1, timeLeftMs / totalMs));
};

export const LADDER_LEVELS = [1, 3, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];

export const LADDER_XP = {
  1: 0,
  3: 5_000,
  5: 15_000,
  10: 50_000,
  15: 80_000,
  20: 120_000,
  25: 180_000,
  30: 260_000,
  40: 400_000,
  50: 600_000,
  60: 800_000,
  70: 1_000_000,
  80: 1_200_000,
  90: 1_400_000,
  100: 1_500_000,
};

export const ladderIndex = (level) => {
  const i = LADDER_LEVELS.findIndex((l) => l >= level);
  return i === -1 ? LADDER_LEVELS.length - 1 : i;
};

export const levelFromXp = (xp) => {
  let idx = 0;
  while (idx < LADDER_LEVELS.length - 1 && xp >= LADDER_XP[LADDER_LEVELS[idx + 1]]) {
    idx += 1;
  }
  return LADDER_LEVELS[idx];
};

export const computeRunPoints = (correct, wrong, speedBonus = 0) =>
  correct * POINTS_PER_CORRECT + wrong * POINTS_PER_WRONG + speedBonus;

/**
 * @param prev {{ xp: number, badges: string[], perCategory: Record<string, {played:number, bestScore:number, correct:number}> }}
 * @param res {{ category: string, correct: number, wrong: number, total: number, speedBonus?: number }}
 */
export const applyRunResult = (prev, res) => {
  const runPoints = computeRunPoints(res.correct, res.wrong, res.speedBonus ?? 0);
  let xp = prev.xp + runPoints;
  let idx = ladderIndex(levelFromXp(prev.xp));
  let leveledUp = false;
  let levelUpBonus = 0;
  while (idx < LADDER_LEVELS.length - 1 && xp >= LADDER_XP[LADDER_LEVELS[idx + 1]]) {
    idx += 1;
    leveledUp = true;
    levelUpBonus += LEVEL_UP_BONUS;
    xp += LEVEL_UP_BONUS;
  }
  const level = LADDER_LEVELS[idx];

  const cat = prev.perCategory[res.category] ?? { played: 0, bestScore: 0, correct: 0 };
  const perCategory = {
    ...prev.perCategory,
    [res.category]: {
      played: cat.played + 1,
      correct: cat.correct + res.correct,
      bestScore: Math.max(cat.bestScore, res.correct),
    },
  };

  const badges = new Set(prev.badges);
  const newBadges = [];
  const add = (b) => {
    if (!badges.has(b)) {
      badges.add(b);
      newBadges.push(b);
    }
  };
  if (perCategory[res.category].played === 1 && Object.keys(perCategory).length === 1) add("first-quiz");
  if (res.correct === res.total) add("perfect-run");
  if (level >= 3) add("initiation");
  if (level >= 10) add("explorateur");
  if (level >= 25) add("maitre-portail");
  if (level >= 50) add("ancien-supreme");

  return {
    next: { xp, level, badges: Array.from(badges), perCategory },
    leveledUp,
    newBadges,
    pointsEarned: runPoints + levelUpBonus,
    levelUpBonus,
  };
};
