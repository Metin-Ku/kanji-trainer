import { db, srsCardsTable, wordsTable } from "@workspace/db";
import type { SrsDeckType } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { ownerOnly } from "./userScope";
import {
  SRS_DECK_TYPES,
  createNewSrsCardFields,
  type SrsCardRow,
} from "./srs";

export async function ensureSrsCardsForWord(wordId: number, userId: number) {
  const existing = await db
    .select({ deckType: srsCardsTable.deckType })
    .from(srsCardsTable)
    .where(
      and(
        eq(srsCardsTable.wordId, wordId),
        ownerOnly(userId, srsCardsTable.userId),
      ),
    );

  const have = new Set(existing.map((r) => r.deckType));
  const missing = SRS_DECK_TYPES.filter((d) => !have.has(d));
  if (missing.length === 0) return;

  const fields = createNewSrsCardFields();
  await db.insert(srsCardsTable).values(
    missing.map((deckType) => ({
      userId,
      wordId,
      deckType,
      ...fields,
    })),
  );
}

export async function ensureSrsCardsForWords(wordIds: number[], userId: number) {
  if (wordIds.length === 0) return;

  const existing = await db
    .select({ wordId: srsCardsTable.wordId, deckType: srsCardsTable.deckType })
    .from(srsCardsTable)
    .where(
      and(
        inArray(srsCardsTable.wordId, wordIds),
        ownerOnly(userId, srsCardsTable.userId),
      ),
    );

  const have = new Set(existing.map((r) => `${r.wordId}:${r.deckType}`));
  const fields = createNewSrsCardFields();
  const toInsert: {
    userId: number;
    wordId: number;
    deckType: SrsDeckType;
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
  }[] = [];

  for (const wordId of wordIds) {
    for (const deckType of SRS_DECK_TYPES) {
      if (!have.has(`${wordId}:${deckType}`)) {
        toInsert.push({ userId, wordId, deckType, ...fields });
      }
    }
  }

  if (toInsert.length > 0) {
    await db.insert(srsCardsTable).values(toInsert);
  }
}

export async function backfillAllSrsCards(userId: number) {
  const words = await db
    .select({ id: wordsTable.id })
    .from(wordsTable)
    .where(ownerOnly(userId, wordsTable.userId));
  await ensureSrsCardsForWords(
    words.map((w) => w.id),
    userId,
  );
}

export function mapSrsRow(row: typeof srsCardsTable.$inferSelect): SrsCardRow {
  return {
    id: row.id,
    wordId: row.wordId,
    deckType: row.deckType,
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsedDays,
    scheduledDays: row.scheduledDays,
    reps: row.reps,
    lapses: row.lapses,
    learningSteps: row.learningSteps,
    state: row.state,
    lastReview: row.lastReview,
    exampleCursor: row.exampleCursor,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function hasSrsExamples(word: typeof wordsTable.$inferSelect): boolean {
  const ex = word.srsExamples;
  return Array.isArray(ex) && ex.length > 0;
}

export async function getDeckStats(deckType: SrsDeckType, userId: number) {
  const now = new Date();
  const rows = await db
    .select({ card: srsCardsTable, word: wordsTable })
    .from(srsCardsTable)
    .innerJoin(wordsTable, eq(srsCardsTable.wordId, wordsTable.id))
    .where(
      and(
        eq(srsCardsTable.deckType, deckType),
        ownerOnly(userId, srsCardsTable.userId),
        ownerOnly(userId, wordsTable.userId),
      ),
    );

  let due = 0;
  let newCount = 0;
  let total = 0;
  for (const { card, word } of rows) {
    if (deckType === "example" && !hasSrsExamples(word)) continue;
    total++;
    const mapped = mapSrsRow(card);
    if (mapped.state === 0 && mapped.reps === 0) newCount++;
    else if (mapped.due.getTime() <= now.getTime()) due++;
  }

  return { total, due, new: newCount };
}

const JLPT_RANK: Record<string, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };

function jlptRank(level: string | null | undefined): number {
  if (!level) return 99;
  return JLPT_RANK[level] ?? 99;
}

export type SrsSortMode = "due-asc" | "date-asc" | "date-desc";

export async function getReviewQueue(
  deckType: SrsDeckType,
  options: {
    jlptMin?: string | null;
    jlptMax?: string | null;
    sort?: SrsSortMode;
    limit?: number;
    wordIds?: number[];
    ignoreDue?: boolean;
    userId: number;
  },
) {
  await backfillAllSrsCards(options.userId);

  const now = new Date();
  const minRank = options.jlptMin ? jlptRank(options.jlptMin) : 1;
  const maxRank = options.jlptMax ? jlptRank(options.jlptMax) : 5;
  const sort = options.sort ?? "due-asc";
  const limit = options.limit ?? 200;
  const wordIdSet =
    options.wordIds && options.wordIds.length > 0
      ? new Set(options.wordIds)
      : null;

  if (wordIdSet && wordIdSet.size === 0) {
    return [];
  }

  const rows = await db
    .select({
      card: srsCardsTable,
      word: wordsTable,
    })
    .from(srsCardsTable)
    .innerJoin(wordsTable, eq(srsCardsTable.wordId, wordsTable.id))
    .where(
      and(
        eq(srsCardsTable.deckType, deckType),
        ownerOnly(options.userId, srsCardsTable.userId),
        ownerOnly(options.userId, wordsTable.userId),
      ),
    );

  const filtered = rows.filter(({ card, word }) => {
    if (wordIdSet && !wordIdSet.has(word.id)) return false;
    const rank = jlptRank(word.jlptLevel);
    if (rank !== 99 && (rank < minRank || rank > maxRank)) return false;
    if (deckType === "example" && !hasSrsExamples(word)) return false;
    return true;
  });

  const queueSource = options.ignoreDue
    ? filtered
    : filtered.filter(({ card }) => {
        const mapped = mapSrsRow(card);
        const isNew = mapped.state === 0 && mapped.reps === 0;
        return isNew || mapped.due.getTime() <= now.getTime();
      });

  queueSource.sort((a, b) => {
    const ca = mapSrsRow(a.card);
    const cb = mapSrsRow(b.card);
    const aNew = ca.state === 0 && ca.reps === 0;
    const bNew = cb.state === 0 && cb.reps === 0;

    if (sort === "date-asc") {
      return a.word.createdAt.getTime() - b.word.createdAt.getTime();
    }
    if (sort === "date-desc") {
      return b.word.createdAt.getTime() - a.word.createdAt.getTime();
    }

    if (aNew && !bNew) return 1;
    if (!aNew && bNew) return -1;
    return ca.due.getTime() - cb.due.getTime();
  });

  return queueSource.slice(0, limit).map(({ card, word }) => ({
    card: mapSrsRow(card),
    word,
  }));
}

export async function getSrsCardById(cardId: number, userId: number) {
  const rows = await db
    .select({ card: srsCardsTable, word: wordsTable })
    .from(srsCardsTable)
    .innerJoin(wordsTable, eq(srsCardsTable.wordId, wordsTable.id))
    .where(
      and(
        eq(srsCardsTable.id, cardId),
        ownerOnly(userId, srsCardsTable.userId),
        ownerOnly(userId, wordsTable.userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function updateSrsCard(
  cardId: number,
  userId: number,
  fields: ReturnType<typeof import("./srs").fsrsCardToRowFields> & {
    exampleCursor?: number;
  },
) {
  const [updated] = await db
    .update(srsCardsTable)
    .set(fields)
    .where(
      and(
        eq(srsCardsTable.id, cardId),
        ownerOnly(userId, srsCardsTable.userId),
      ),
    )
    .returning();
  return updated ? mapSrsRow(updated) : null;
}

export async function clampExampleCursorForWord(wordId: number, exampleCount: number) {
  if (exampleCount <= 0) return;
  const rows = await db
    .select()
    .from(srsCardsTable)
    .where(eq(srsCardsTable.wordId, wordId));
  for (const row of rows) {
    if (row.deckType !== "example") continue;
    const max = exampleCount - 1;
    if (row.exampleCursor > max) {
      await db
        .update(srsCardsTable)
        .set({ exampleCursor: max })
        .where(eq(srsCardsTable.id, row.id));
    }
  }
}
