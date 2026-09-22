export type Difficulty = "facile" | "moyen" | "difficile" | "ultime";

export type QuestionKind = "mcq" | "truefalse" | "image" | "matching";

export interface MatchingPair {
  left: string;
  right: string;
}

export interface QuizQuestion {
  id: string;
  difficulty: Difficulty;
  subcategory: string;
  question: string;
  /** Discriminator for the question UI/logic. Defaults to "mcq" when omitted. */
  kind?: QuestionKind;
  /** Choices for mcq / truefalse / image. */
  choices?: string[];
  /** Correct index in choices (mcq / truefalse / image). */
  answer?: number;
  /** Optional image URL (used by `image` kind, also allowed on mcq). */
  imageUrl?: string;
  /** Optional fallback giant emoji shown when imageUrl is missing. */
  imageEmoji?: string;
  /** Pairs for `matching` kind. */
  pairs?: MatchingPair[];
  funFact: string;
  xp: number;
}

export interface CategoryTheme {
  primary: string;
  accent: string;
  bgFrom: string;
  bgTo: string;
  ring: string;
}

export interface QuizCategory {
  key: string;
  name: string;
  emoji: string;
  tagline: string;
  subcategories: string[];
  theme: CategoryTheme;
  immersiveMessages: string[];
  questions: QuizQuestion[];
}
