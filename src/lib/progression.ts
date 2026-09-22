/**
 * Progression — XP, levels, badges, per-category stats.
 * Signed-in players: authoritative source is the backend (GET /api/progression),
 * updated server-side by POST /api/games/:id/finish.
 * Guests: kept in localStorage exactly as before, but the correct/wrong tallies
 * feeding it now come from the server-validated game session instead of being
 * computed client-side.
 */
import { api } from "./api";
import { isAuthed } from "./auth";

const STORAGE_KEY = "marbou7a:progression:v1";

export type BadgeId =
  | "initiation"
  | "explorateur"
  | "maitre-portail"
  | "ancien-supreme"
  | "perfect-run"
  | "first-quiz";

export interface Progression {
  xp: number;
  level: number;
  badges: BadgeId[];
  unlockedCategories: string[];
  perCategory: Record<string, { played: number; bestScore: number; correct: number }>;
}

const LEVEL_TITLES = [
  "Initiation",
  "Explorateur",
  "Maître du portail",
  "Ancien suprême",
];

const DEFAULT: Progression = {
  xp: 0,
  level: 1,
  badges: [],
  unlockedCategories: ["science", "sport", "history", "archeo", "ent", "art"],
  perCategory: {},
};

/** Paliers officiels de l'échelle de progression (Ladder). */
export const LADDER_LEVELS = [1, 3, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];

/** XP total cumulé requis pour atteindre chaque palier. */
export const LADDER_XP: Record<number, number> = {
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

/** Index du palier courant dans LADDER_LEVELS (0 si inconnu). */
export const ladderIndex = (level: number) => {
  const i = LADDER_LEVELS.findIndex((l) => l >= level);
  return i === -1 ? LADDER_LEVELS.length - 1 : i;
};

/** Détermine le niveau correspondant à un XP total cumulé. */
export const levelFromXp = (xp: number) => {
  let idx = 0;
  while (idx < LADDER_LEVELS.length - 1 && xp >= LADDER_XP[LADDER_LEVELS[idx + 1]]) {
    idx += 1;
  }
  return LADDER_LEVELS[idx];
};

/** XP total requis pour atteindre le palier suivant (le max si déjà au sommet). */
export const xpToNextLevel = (level: number) => {
  const idx = ladderIndex(level);
  const next = LADDER_LEVELS[Math.min(idx + 1, LADDER_LEVELS.length - 1)];
  return LADDER_XP[next];
};

/** XP requis pour le palier donné. */
export const xpForLevel = (level: number) => LADDER_XP[LADDER_LEVELS[ladderIndex(level)]] ?? 0;

/** Progression (0→1) vers le palier suivant. */
export const levelProgress = (xp: number, level: number) => {
  const from = xpForLevel(level);
  const to = xpToNextLevel(level);
  if (to <= from) return 1;
  return Math.min(1, Math.max(0, (xp - from) / (to - from)));
};

/** Niveau palier suivant (null si déjà au sommet). */
export const nextLadderLevel = (level: number) => {
  const idx = ladderIndex(level);
  if (idx >= LADDER_LEVELS.length - 1) return null;
  return LADDER_LEVELS[idx + 1];
};

/** Nombre de bonnes réponses nécessaires pour atteindre le palier suivant. */
export const correctAnswersToNextLevel = (xp: number, level: number) => {
  const target = xpToNextLevel(level);
  const deficit = target - xp;
  if (deficit <= 0) return 0;
  return Math.ceil(deficit / POINTS_PER_CORRECT);
};

/** Nombre de bonnes réponses nécessaires pour atteindre un palier cible donné. */
export const correctAnswersToLevel = (xp: number, targetLevel: number) => {
  const targetXp = LADDER_XP[targetLevel] ?? LADDER_XP[100];
  const deficit = targetXp - xp;
  if (deficit <= 0) return 0;
  return Math.ceil(deficit / POINTS_PER_CORRECT);
};

export const levelTitle = (level: number) =>
  LEVEL_TITLES[Math.min(ladderIndex(level), LEVEL_TITLES.length - 1)] || "Légende";


const readLocal = (): Progression => {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = { ...DEFAULT, ...JSON.parse(raw) } as Progression;
    // Le niveau doit toujours être cohérent avec l'XP total cumulé.
    parsed.level = levelFromXp(parsed.xp);
    return parsed;
  } catch {
    return DEFAULT;
  }
};

const writeLocal = (p: Progression) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
};

interface ServerProgression {
  xp: number;
  level: number;
  badges: string[];
  perCategory: Progression["perCategory"];
}

/**
 * Connecté : lit la progression authoritative depuis le backend.
 * Invité : lit le snapshot local (mis à jour par `saveProgression` après chaque
 * partie, dont le score a été validé côté serveur — voir QuizPlay).
 */
export const loadProgression = async (): Promise<Progression> => {
  if (isAuthed()) {
    try {
      const data = await api.get<ServerProgression>("/progression");
      return { ...DEFAULT, xp: data.xp, level: data.level, badges: data.badges as BadgeId[], perCategory: data.perCategory };
    } catch {
      return readLocal();
    }
  }
  return readLocal();
};

/** Persiste la progression d'un invité en local (les comptes connectés sont gérés côté serveur). */
export const saveProgression = (p: Progression) => {
  writeLocal(p);
};

/** Barème officiel des points (source de vérité : backend_marbou7a/src/services/scoring.service.js). */
export const POINTS_PER_CORRECT = 500;
export const POINTS_PER_WRONG = 50;
export const LEVEL_UP_BONUS = 1000;

/** Bonus de rapidité maximal par question « whoami »/« sound » — affichage live uniquement. */
export const SPEED_BONUS_MAX = 500;

/** Aperçu du bonus de rapidité pendant que le minuteur tourne (le score réel vient du serveur). */
export const computeSpeedBonus = (timeLeft: number, totalTime: number) => {
  if (totalTime <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, timeLeft / totalTime));
  return Math.round(SPEED_BONUS_MAX * ratio);
};

/** Points gagnés sur une partie (hors bonus de niveau franchi) — affichage live pendant le quiz uniquement. */
export const computeRunPoints = (correct: number, wrong: number, speedBonus = 0) =>
  correct * POINTS_PER_CORRECT + wrong * POINTS_PER_WRONG + speedBonus;

export interface RunOutcome {
  leveledUp: boolean;
  newBadges: BadgeId[];
  finalXp: number;
  finalLevel: number;
  pointsEarned: number;
  levelUpBonus: number;
  progression: ServerProgression;
}

export const BADGE_LABELS: Record<BadgeId, { label: string; emoji: string }> = {
  "first-quiz": { label: "Premier quiz", emoji: "🎯" },
  "perfect-run": { label: "Sans faute", emoji: "💎" },
  initiation: { label: "Initiation", emoji: "🔰" },
  explorateur: { label: "Explorateur", emoji: "🧭" },
  "maitre-portail": { label: "Maître du portail", emoji: "🌀" },
  "ancien-supreme": { label: "Ancien suprême", emoji: "👑" },
};
