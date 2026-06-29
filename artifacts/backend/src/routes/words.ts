import { Router } from "express";
import { db, wordsTable, wordRelationsTable } from "@workspace/db";
import { eq, or, inArray } from "drizzle-orm";
import {
  CreateWordBody,
  UpdateWordBody,
  BulkCreateWordsBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { ensureSrsCardsForWord, ensureSrsCardsForWords } from "../lib/srsCards";

const router = Router();

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
  const words = await db.select().from(wordsTable).orderBy(wordsTable.createdAt);
  const relations = await db.select().from(wordRelationsTable);

  // Build a map: wordId → Set of relatedWordIds (bidirectional)
  const relMap = new Map<number, number[]>();
  for (const r of relations) {
    if (!relMap.has(r.wordId)) relMap.set(r.wordId, []);
    relMap.get(r.wordId)!.push(r.relatedWordId);
    if (!relMap.has(r.relatedWordId)) relMap.set(r.relatedWordId, []);
    relMap.get(r.relatedWordId)!.push(r.wordId);
  }

  const result = words.map((w) => ({
    ...w,
    relatedWordIds: relMap.get(w.id) ?? [],
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

  const incoming = parsed.data.words;
  const existing = await db.select({ kanji: wordsTable.kanji }).from(wordsTable);
  const existingSet = new Set(existing.map((w) => w.kanji.normalize("NFC")));

  const toAdd = incoming.filter((w) => !existingSet.has(w.kanji.normalize("NFC")));
  const toUpdate = incoming.filter((w) => existingSet.has(w.kanji.normalize("NFC")));

  const today = new Date().toISOString().slice(0, 10);

  if (toAdd.length > 0) {
    const inserted = await db.insert(wordsTable).values(
      toAdd.map((w) => ({
        kanji: w.kanji,
        pronunciation: w.pronunciation ?? "",
        meaning: w.meaning ?? "",
        description: w.description ?? "",
        level: 1,
        jlptLevel: w.jlptLevel ?? null,
        date: today,
      }))
    ).returning({ id: wordsTable.id });
    await ensureSrsCardsForWords(inserted.map((w) => w.id));
  }

  for (const w of toUpdate) {
    await db
      .update(wordsTable)
      .set({
        pronunciation: w.pronunciation ?? "",
        meaning: w.meaning ?? "",
        description: w.description ?? "",
        jlptLevel: w.jlptLevel ?? null,
      })
      .where(eq(wordsTable.kanji, w.kanji));
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
  const { kanji, pronunciation = "", meaning = "", description = "", level = 1, jlptLevel, date, relatedWordIds } = parsed.data;
  const [word] = await db
    .insert(wordsTable)
    .values({ kanji, pronunciation, meaning, description, level, jlptLevel: jlptLevel ?? null, date })
    .returning();
  if (relatedWordIds && relatedWordIds.length > 0) {
    await setRelatedWords(word.id, relatedWordIds);
  }
  await ensureSrsCardsForWord(word.id);
  res.status(201).json({ ...word, relatedWordIds: relatedWordIds ?? [] });
});

router.patch("/words/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateWordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await db.select().from(wordsTable).where(eq(wordsTable.id, id));
  if (existing.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { relatedWordIds, ...wordFields } = parsed.data;
  const [updated] = await db
    .update(wordsTable)
    .set(wordFields)
    .where(eq(wordsTable.id, id))
    .returning();

  if (relatedWordIds !== undefined) {
    await setRelatedWords(id, relatedWordIds);
  }

  const finalRelatedIds = relatedWordIds !== undefined
    ? relatedWordIds
    : await getRelatedWordIds(id);

  res.json({ ...updated, relatedWordIds: finalRelatedIds });
});

router.delete("/words/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await db.select().from(wordsTable).where(eq(wordsTable.id, id));
  if (existing.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.delete(wordsTable).where(eq(wordsTable.id, id));
  res.status(204).send();
});

export default router;
