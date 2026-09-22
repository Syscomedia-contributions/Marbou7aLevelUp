import type { CategoryTheme } from "./types";

export interface QuizCategoryMeta {
  key: string;
  name: string;
  emoji: string;
  tagline: string;
  subcategories: string[];
  theme: CategoryTheme;
  immersiveMessages: string[];
}

// Category metadata only (no questions/answers) — safe to bundle into the frontend.
// Kept in sync with backend_marbou7a/src/db/seed-data.json (extracted from the same
// original source). Used by portal decorations, footer links, etc. Actual quiz
// questions are fetched server-side (POST /api/games) so correct answers never ship
// in the client bundle.
export const QUIZ_CATEGORY_META: QuizCategoryMeta[] = [
  {
    "key": "science",
    "name": "Science",
    "emoji": "🧪",
    "tagline": "Laboratoire futuriste — explore l'univers",
    "subcategories": [
      "Espace",
      "Physique",
      "Chimie",
      "Biologie",
      "Technologies",
      "Inventions"
    ],
    "theme": {
      "primary": "210 100% 55%",
      "accent": "188 100% 55%",
      "bgFrom": "215 80% 8%",
      "bgTo": "220 90% 4%",
      "ring": "210 100% 60%"
    },
    "immersiveMessages": [
      "Analyse scientifique en cours…",
      "Base de données quantique connectée",
      "Intelligence augmentée activée"
    ]
  },
  {
    "key": "sport",
    "name": "Sport",
    "emoji": "⚽",
    "tagline": "Arène intergalactique — entre dans la compétition",
    "subcategories": [
      "Football",
      "Basketball",
      "Jeux Olympiques",
      "Tennis",
      "Records",
      "Tunisie & Monde"
    ],
    "theme": {
      "primary": "16 90% 55%",
      "accent": "40 100% 60%",
      "bgFrom": "10 60% 10%",
      "bgTo": "20 70% 5%",
      "ring": "20 100% 60%"
    },
    "immersiveMessages": [
      "Préparation de l'arène…",
      "Compétition intergalactique lancée",
      "Niveau champion détecté"
    ]
  },
  {
    "key": "history",
    "name": "Histoire",
    "emoji": "🏺",
    "tagline": "Archives anciennes — voyage dans le temps",
    "subcategories": [
      "Égypte antique",
      "Guerres mondiales",
      "Civilisations",
      "Empires",
      "Tunisie & Monde arabe",
      "Découvertes"
    ],
    "theme": {
      "primary": "82 39% 35%",
      "accent": "82 45% 55%",
      "bgFrom": "82 30% 8%",
      "bgTo": "82 35% 4%",
      "ring": "82 50% 55%"
    },
    "immersiveMessages": [
      "Archives anciennes ouvertes",
      "Chronologie restaurée",
      "Voyage temporel initié"
    ]
  },
  {
    "key": "archeo",
    "name": "Archéologie",
    "emoji": "🏛️",
    "tagline": "Fouilles & découvertes — réveille l'archéologue en toi",
    "subcategories": [
      "Égypte",
      "Rome",
      "Préhistoire",
      "Moyen Âge",
      "Grèce",
      "Mystères"
    ],
    "theme": {
      "primary": "35 60% 40%",
      "accent": "30 70% 50%",
      "bgFrom": "30 50% 8%",
      "bgTo": "25 60% 4%",
      "ring": "35 100% 50%"
    },
    "immersiveMessages": [
      "Préparation des fouilles…",
      "Artéfacts anciens détectés",
      "Expédition archéologique lancée"
    ]
  },
  {
    "key": "ent",
    "name": "Divertissement",
    "emoji": "🎬",
    "tagline": "Néons & cinéma futuriste — synchronisation culturelle",
    "subcategories": [
      "Films",
      "Séries",
      "Jeux vidéo",
      "Musique",
      "Internet",
      "Animés"
    ],
    "theme": {
      "primary": "300 90% 60%",
      "accent": "280 100% 65%",
      "bgFrom": "290 60% 8%",
      "bgTo": "270 70% 4%",
      "ring": "300 100% 65%"
    },
    "immersiveMessages": [
      "Chargement des archives multimédias…",
      "Séquence de divertissement activée",
      "Univers culturel synchronisé"
    ]
  },
  {
    "key": "art",
    "name": "Art",
    "emoji": "🎨",
    "tagline": "Galerie mystique — patrimoine culturel détecté",
    "subcategories": [
      "Peinture",
      "Sculpture",
      "Architecture",
      "Musique classique",
      "Art moderne",
      "Art arabe & tunisien"
    ],
    "theme": {
      "primary": "340 70% 60%",
      "accent": "30 100% 60%",
      "bgFrom": "340 50% 10%",
      "bgTo": "350 60% 5%",
      "ring": "30 100% 65%"
    },
    "immersiveMessages": [
      "Galerie des civilisations ouverte",
      "Analyse artistique en cours",
      "Patrimoine culturel détecté"
    ]
  }
];

export const getCategoryMeta = (key: string) => QUIZ_CATEGORY_META.find((c) => c.key === key);
