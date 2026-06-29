import {
  createEmptyCard,
  FSRS,
  Rating,
  type Card,
  generatorParameters,
} from "ts-fsrs";

export type SrsDeckType = "word" | "pronunciation" | "meaning";

export const SRS_DECK_TYPES: SrsDeckType[] = ["word", "pronunciation", "meaning"];

export type SrsCardRow = {
  id: number;
  wordId: number;
  deckType: string;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  learningSteps: number;
  state: number;
  lastReview: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewRating = Rating.Again | Rating.Hard | Rating.Good | Rating.Easy;

export const fsrs = new FSRS(
  generatorParameters({
    enable_fuzz: true,
    enable_short_term: true,
  }),
);

export function rowToFsrsCard(row: SrsCardRow): Card {
  return {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays,
    reps: row.reps,
    lapses: row.lapses,
    learning_steps: row.learningSteps,
    state: row.state,
    last_review: row.lastReview ?? undefined,
  };
}

export function fsrsCardToRowFields(card: Card) {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    learningSteps: card.learning_steps,
    state: card.state,
    lastReview: card.last_review ?? null,
    updatedAt: new Date(),
  };
}

export function createNewSrsCardFields(now = new Date()) {
  const card = createEmptyCard(now);
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    learningSteps: card.learning_steps,
    state: card.state,
    lastReview: null as Date | null,
  };
}

export function reviewCard(row: SrsCardRow, rating: ReviewRating, now = new Date()) {
  const card = rowToFsrsCard(row);
  const result = fsrs.next(card, now, rating);
  return {
    card: result.card,
    log: result.log,
    fields: fsrsCardToRowFields(result.card),
  };
}

export function previewIntervals(row: SrsCardRow, now = new Date()) {
  const card = rowToFsrsCard(row);
  const scheduling = fsrs.repeat(card, now);
  return {
    again: formatInterval(scheduling[Rating.Again].card.due, now),
    hard: formatInterval(scheduling[Rating.Hard].card.due, now),
    good: formatInterval(scheduling[Rating.Good].card.due, now),
    easy: formatInterval(scheduling[Rating.Easy].card.due, now),
  };
}

export function formatInterval(due: Date, now: Date): string {
  const ms = due.getTime() - now.getTime();
  if (ms <= 0) return "<1m";

  const minutes = ms / 60_000;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;

  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h`;

  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d`;

  const months = days / 30;
  if (months < 12) return `${Math.round(months)}mo`;

  const years = months / 12;
  if (years < 10) return `${years.toFixed(1)}yr`;
  return `${Math.round(years)}yr`;
}

export function isCardDue(row: SrsCardRow, now = new Date()): boolean {
  return row.due.getTime() <= now.getTime();
}

export function isNewCard(row: SrsCardRow): boolean {
  return row.state === 0 && row.reps === 0;
}
