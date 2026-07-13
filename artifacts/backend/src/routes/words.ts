import { Router } from "express";
import { db, wordsTable, wordRelationsTable, categoryWordsTable } from "@workspace/db";
import { eq, or, inArray, and } from "drizzle-orm";
import {
  CreateWordBody,
  UpdateWordBody,
  BulkCreateWordsBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { ensureSrsCardsForWord, ensureSrsCardsForWords, clampExampleCursorForWord } from "../lib/srsCards";
import {
  getCategoryIdsForWord,
  setCategoryWords,
} from "../lib/categoryWords";
import { matchCategoryNames } from "../lib/categoryMatch";
import { categoriesTable } from "@workspace/db";
import { getUserId } from "../middleware/auth";
import { ownerOnly } from "../lib/userScope";

const router = Router();

function parseIdArray(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return [
    ...new Set(
      raw
        .map((v) => Number(v))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

async function getRelatedWordIds(wordId: number): Promise<number[]> {
  const rows = await db
    .select()
    .from(wordRelationsTable)
    .where(
      or(
        eq(wordRelationsTable.wordId, wordId),
        eq(wordRelationsTable.relatedWordId, wordId),
      ),
    );
  return rows.map((r) =>
    r.wordId === wordId ? r.relatedWordId : r.wordId,
  );
}

async function setRelatedWords(wordId: number, relatedIds: number[]): Promise<void> {
  // Delete existing relations for this word (both directions)
  await db
    .delete(wordRelationsTable)
    .where(
      or(
        eq(wordRelationsTable.wordId, wordId),
        eq(wordRelationsTable.relatedWordId, wordId),
      ),
    );
  // Insert new relations (store one direction; query fetches both)
  if (relatedIds.length > 0) {
    const unique = [...new Set(relatedIds.filter((id) => id !== wordId))];
    await db.insert(wordRelationsTable).values(
      unique.map((rid) => ({ wordId, relatedWordId: rid })),
    );
  }
}

router.get("/words", async (req, res, next) => {
  try {
  const userId = getUserId(req);
  const words = await db
    .select()
    .from(wordsTable)
    .where(ownerOnly(userId, wordsTable.userId))
    .orderBy(wordsTable.createdAt);
  const wordIds = words.map((w) => w.id);
  const relations = wordIds.length
    ? await db
        .select()
        .from(wordRelationsTable)
        .where(
          or(
            inArray(wordRelationsTable.wordId, wordIds),
            inArray(wordRelationsTable.relatedWordId, wordIds),
          ),
        )
    : [];
  const categoryLinks = wordIds.length
    ? await db
        .select()
        .from(categoryWordsTable)
        .where(inArray(categoryWordsTable.wordId, wordIds))
    : [];

  // Build a map: wordId → Set of relatedWordIds (bidirectional)
  const relMap = new Map<number, number[]>();
  for (const r of relations) {
    if (!relMap.has(r.wordId)) relMap.set(r.wordId, []);
    relMap.get(r.wordId)!.push(r.relatedWordId);
    if (!relMap.has(r.relatedWordId)) relMap.set(r.relatedWordId, []);
    relMap.get(r.relatedWordId)!.push(r.wordId);
  }

  const catMap = new Map<number, number[]>();
  for (const link of categoryLinks) {
    if (!catMap.has(link.wordId)) catMap.set(link.wordId, []);
    catMap.get(link.wordId)!.push(link.categoryId);
  }

  const result = words.map((w) => ({
    ...w,
    relatedWordIds: relMap.get(w.id) ?? [],
    categoryIds: catMap.get(w.id) ?? [],
  }));
  res.json(result);
  } catch (err) {
    logger.error({ err, cause: err instanceof Error ? err.cause : undefined }, "GET /words failed");
    next(err);
  }
});

router.post("/words/bulk", async (req, res) => {
  const parsed = BulkCreateWordsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rawWords = Array.isArray(req.body?.words)
    ? (req.body.words as Record<string, unknown>[])
    : [];

  const incoming = parsed.data.words.map((w, i) => ({
    ...w,
    categoryNames: parseStringArray(rawWords[i]?.categoryNames),
    synonymKanji: parseStringArray(rawWords[i]?.synonymKanji),
  }));

  const existingRows = await db
    .select({ id: wordsTable.id, kanji: wordsTable.kanji })
    .from(wordsTable)
    .where(ownerOnly(getUserId(req), wordsTable.userId));
  const existingSet = new Set(existingRows.map((w) => w.kanji.normalize("NFC")));
  const kanjiToId = new Map(
    existingRows.map((w) => [w.kanji.normalize("NFC"), w.id]),
  );

  const toAdd = incoming.filter((w) => !existingSet.has(w.kanji.normalize("NFC")));
  const toUpdate = incoming.filter((w) => existingSet.has(w.kanji.normalize("NFC")));

  const today = new Date().toISOString().slice(0, 10);

  if (toAdd.length > 0) {
    const inserted = await db.insert(wordsTable).values(
      toAdd.map((w) => ({
        userId: getUserId(req),
        kanji: w.kanji,
        pronunciation: w.pronunciation ?? "",
        meaning: w.meaning ?? "",
        description: w.description ?? "",
        srsExamples: w.srsExamples ?? [],
        level: 1,
        jlptLevel: w.jlptLevel ?? null,
        date: today,
      }))
    ).returning({ id: wordsTable.id, kanji: wordsTable.kanji });
    await ensureSrsCardsForWords(inserted.map((w) => w.id), getUserId(req));
    for (const row of inserted) {
      kanjiToId.set(row.kanji.normalize("NFC"), row.id);
    }
  }

  for (const w of toUpdate) {
    const srsExamples = w.srsExamples ?? [];
    await db
      .update(wordsTable)
      .set({
        pronunciation: w.pronunciation ?? "",
        meaning: w.meaning ?? "",
        description: w.description ?? "",
        srsExamples,
        jlptLevel: w.jlptLevel ?? null,
      })
      .where(
        and(
          eq(wordsTable.kanji, w.kanji),
          ownerOnly(getUserId(req), wordsTable.userId),
        ),
      );

    const [updated] = await db
      .select({ id: wordsTable.id })
      .from(wordsTable)
      .where(
        and(
          eq(wordsTable.kanji, w.kanji),
          ownerOnly(getUserId(req), wordsTable.userId),
        ),
      )
      .limit(1);
    if (updated) {
      kanjiToId.set(w.kanji.normalize("NFC"), updated.id);
      await clampExampleCursorForWord(updated.id, srsExamples.length);
    }
  }

  const allCategories = await db
    .select({ id: categoriesTable.id, name: categoriesTable.name })
    .from(categoriesTable)
    .where(ownerOnly(getUserId(req), categoriesTable.userId));

  for (const w of incoming) {
    const wordId = kanjiToId.get(w.kanji.normalize("NFC"));
    if (!wordId) continue;

    if (w.categoryNames.length > 0) {
      const categoryIds = matchCategoryNames(w.categoryNames, allCategories);
      if (categoryIds.length > 0) {
        await setCategoryWords(wordId, categoryIds);
      }
    }

    if (w.synonymKanji.length > 0) {
      const synonymIds = w.synonymKanji
        .map((k) => kanjiToId.get(k.normalize("NFC")))
        .filter((id): id is number => id != null && id !== wordId);
      if (synonymIds.length > 0) {
        const existingRelated = await getRelatedWordIds(wordId);
        await setRelatedWords(wordId, [
          ...new Set([...existingRelated, ...synonymIds]),
        ]);
      }
    }
  }

  res.json({
    total: incoming.length,
    added: toAdd.length,
    updated: toUpdate.length,
    updatedWords: toUpdate.map((w) => w.kanji),
  });
});

router.post("/words", async (req, res) => {
  const parsed = CreateWordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { kanji, pronunciation = "", meaning = "", description = "", srsExamples = [], level = 1, jlptLevel, date, relatedWordIds } = parsed.data;
  const categoryIds = parseIdArray(req.body?.categoryIds);
  const [word] = await db
    .insert(wordsTable)
    .values({
      userId: getUserId(req),
      kanji,
      pronunciation,
      meaning,
      description,
      srsExamples,
      level,
      jlptLevel: jlptLevel ?? null,
      date,
    })
    .returning();
  if (relatedWordIds && relatedWordIds.length > 0) {
    await setRelatedWords(word.id, relatedWordIds);
  }
  if (categoryIds && categoryIds.length > 0) {
    await setCategoryWords(word.id, categoryIds);
  }
  await ensureSrsCardsForWord(word.id, getUserId(req));
  res.status(201).json({
    ...word,
    relatedWordIds: relatedWordIds ?? [],
    categoryIds: categoryIds ?? [],
  });
});

router.patch("/words/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateWordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await db
    .select()
    .from(wordsTable)
    .where(
      and(eq(wordsTable.id, id), ownerOnly(getUserId(req), wordsTable.userId)),
    );
  if (existing.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { relatedWordIds, srsExamples, ...wordFields } = parsed.data;
  const categoryIds = parseIdArray(req.body?.categoryIds);
  const patch: Record<string, unknown> = { ...wordFields };
  if (srsExamples !== undefined) patch.srsExamples = srsExamples;

  const [updated] = await db
    .update(wordsTable)
    .set(patch)
    .where(eq(wordsTable.id, id))
    .returning();

  if (srsExamples !== undefined) {
    await clampExampleCursorForWord(id, srsExamples.length);
  }

  if (relatedWordIds !== undefined) {
    await setRelatedWords(id, relatedWordIds);
  }

  if (categoryIds !== undefined) {
    await setCategoryWords(id, categoryIds);
  }

  const finalRelatedIds = relatedWordIds !== undefined
    ? relatedWordIds
    : await getRelatedWordIds(id);
  const finalCategoryIds = categoryIds !== undefined
    ? categoryIds
    : await getCategoryIdsForWord(id);

  res.json({
    ...updated,
    relatedWordIds: finalRelatedIds,
    categoryIds: finalCategoryIds,
  });
});

router.delete("/words/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await db
    .select()
    .from(wordsTable)
    .where(
      and(eq(wordsTable.id, id), ownerOnly(getUserId(req), wordsTable.userId)),
    );
  if (existing.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.delete(wordsTable).where(eq(wordsTable.id, id));
  res.status(204).send();
});

export default router;
