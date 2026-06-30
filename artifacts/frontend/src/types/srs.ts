import type { SrsExample } from "../types";

export type SrsDeckType = "word" | "pronunciation" | "meaning" | "example";

export type SrsSortMode = "due-asc" | "date-asc" | "date-desc";

export type ReviewRating = 1 | 2 | 3 | 4;

export interface SrsIntervals {
  again: string;
  hard: string;
  good: string;
  easy: string;
}

export interface SrsCard {
  id: number;
  wordId: number;
  deckType: SrsDeckType;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  learningSteps: number;
  state: number;
  lastReview: string | null;
  exampleCursor: number;
  createdAt: string;
  updatedAt: string;
  intervals: SrsIntervals;
}

export interface SrsDeckStats {
  deckType: SrsDeckType;
  total: number;
  due: number;
  new: number;
}

export interface SrsQueueItem {
  card: SrsCard;
  word: {
    id: number;
    kanji: string;
    pronunciation: string;
    meaning: string;
    description: string;
    srsExamples: SrsExample[];
    level: number;
    starred: boolean;
    pronLevel: number;
    pronStarred: boolean;
    meaningLevel: number;
    meaningStarred: boolean;
    jlptLevel?: string | null;
    date: string;
    createdAt: string;
    updatedAt: string;
    relatedWordIds: number[];
  };
}

export const SRS_DECK_LABELS: Record<
  SrsDeckType,
  { title: string; subtitle: string }
> = {
  word: { title: "Kelime", subtitle: "Word" },
  pronunciation: { title: "Okunuş", subtitle: "Pronunciation" },
  meaning: { title: "Anlam", subtitle: "Meaning" },
  example: { title: "Örnek", subtitle: "Example sentences" },
};

export const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
