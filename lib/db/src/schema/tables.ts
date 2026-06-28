import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";

export const wordsTable = pgTable("words", {
  id: serial("id").primaryKey(),
  kanji: text("kanji").notNull(),
  pronunciation: text("pronunciation").notNull().default(""),
  meaning: text("meaning").notNull().default(""),
  description: text("description").notNull().default(""),
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
