export type QuestionKind = "mcq" | "truefalse" | "image" | "matching" | "whoami" | "sound" | "puzzle";

export interface QuestionTranslation {
  sub?: string;
  q: string;
  c?: string[];
  /** Translated progressive clues for the `whoami` kind. */
  cl?: string[];
  /** Translated tile captions for the `puzzle` kind, in canonical (server) order. */
  pt?: string[];
  f: string;
}

export interface PuzzleTile {
  id: string;
  label: string;
  imageUrl: string;
  imagePosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

/** A question as served by POST /api/games — answer/correct pairs are never included. */
export interface PublicQuizQuestion {
  id: string;
  categoryKey: string;
  difficulty: "facile" | "moyen" | "difficile" | "ultime";
  subcategory: string;
  kind: QuestionKind;
  question: string;
  choices?: string[];
  imageUrl?: string | null;
  imageEmoji?: string | null;
  audioUrl?: string | null;
  matchingLeft?: string[];
  matchingRightShuffled?: string[];
  /** Progressive clues for the `whoami` kind. */
  clues?: string[];
  /** Shuffled tiles for the `puzzle` kind — never in their correct order. */
  puzzleTilesShuffled?: PuzzleTile[];
  funFact: string;
  xp: number;
  translations: Partial<Record<"en" | "ar", QuestionTranslation>>;
}

export interface GameStartResponse {
  sessionId: string;
  questions: PublicQuizQuestion[];
}

export interface AnswerResponse {
  isCorrect: boolean;
  correctIndex: number | null;
  correctPairs: { left: string; right: string }[] | null;
  /** Correct tile id order for the `puzzle` kind, revealed only after submission. */
  correctTileOrder: string[] | null;
  /** Server-computed speed bonus for this answer (whoami / sound kinds only). */
  speedBonus: number;
}

export interface FinishResponse {
  leveledUp: boolean;
  newBadges: string[];
  finalXp: number;
  finalLevel: number;
  pointsEarned: number;
  levelUpBonus: number;
  /** Total speed bonus accumulated this run (whoami / sound kinds). */
  speedBonus: number;
  correct: number;
  wrong: number;
  total: number;
  progression: {
    xp: number;
    level: number;
    badges: string[];
    perCategory: Record<string, { played: number; bestScore: number; correct: number }>;
  };
}
