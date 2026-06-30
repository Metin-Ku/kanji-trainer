import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  primaryKey,
  real,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";

export type SrsExampleHint = {
  text: string;
  highlights?: string[];
};

export type RubyPart = {
  base: string;
  reading?: string;
};

export type TargetChunk = {
  type: "text" | "hidden";
  text: string;
  reading?: string;
  ruby?: RubyPart[];
  script?: "kanji" | "hiragana" | "katakana";
};

export type LinkedToken = {
  start: number;
  end: number;
  surface: string;
  wordId: number;
  lemma?: string;
};

export type SrsExample = {
  order: number;
  sentence: string;
  hiddenWord: string;
  hiddenReading?: string;
  hiddenScript?: "kanji" | "hiragana" | "katakana";
  targetChunks?: TargetChunk[];
  linkedTokens?: LinkedToken[];
  hints: SrsExampleHint[];
};

export const wordsTable = pgTable("words", {
  id: serial("id").primaryKey(),
  kanji: text("kanji").notNull(),
  pronunciation: text("pronunciation").notNull().default(""),
  meaning: text("meaning").notNull().default(""),
  description: text("description").notNull().default(""),
  srsExamples: jsonb("srs_examples")
    .$type<SrsExample[]>()
    .notNull()
    .default([]),
  level: integer("level").notNull().default(1),
  starred: boolean("starred").notNull().default(false),
  pronLevel: integer("pron_level").notNull().default(1),
  pronStarred: boolean("pron_starred").notNull().default(false),
  meaningLevel: integer("meaning_level").notNull().default(1),
  meaningStarred: boolean("meaning_starred").notNull().default(false),
  jlptLevel: text("jlpt_level"),
  date: text("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const wordRelationsTable = pgTable(
  "word_relations",
  {
    wordId: integer("word_id")
      .notNull()
      .references(() => wordsTable.id, { onDelete: "cascade" }),
    relatedWordId: integer("related_word_id")
      .notNull()
      .references(() => wordsTable.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.wordId, t.relatedWordId] })],
);

export const srsDeckTypes = ["word", "pronunciation", "meaning", "example"] as const;
export type SrsDeckType = (typeof srsDeckTypes)[number];

export const srsCardsTable = pgTable(
  "srs_cards",
  {
    id: serial("id").primaryKey(),
    wordId: integer("word_id")
      .notNull()
      .references(() => wordsTable.id, { onDelete: "cascade" }),
    deckType: text("deck_type").notNull(),
    due: timestamp("due", { withTimezone: true }).notNull(),
    stability: real("stability").notNull().default(0),
    difficulty: real("difficulty").notNull().default(0),
    elapsedDays: integer("elapsed_days").notNull().default(0),
    scheduledDays: integer("scheduled_days").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    learningSteps: integer("learning_steps").notNull().default(0),
    state: integer("state").notNull().default(0),
    lastReview: timestamp("last_review", { withTimezone: true }),
    exampleCursor: integer("example_cursor").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("srs_cards_word_deck_idx").on(t.wordId, t.deckType)],
);
