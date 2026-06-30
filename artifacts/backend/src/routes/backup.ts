import { Router } from "express";
import {
  db,
  wordsTable,
  wordRelationsTable,
  srsCardsTable,
} from "@workspace/db";

const router = Router();

router.get("/backup", async (_req, res, next) => {
  try {
    const [words, relations, srsCards] = await Promise.all([
      db.select().from(wordsTable).orderBy(wordsTable.id),
      db.select().from(wordRelationsTable),
      db.select().from(srsCardsTable).orderBy(srsCardsTable.id),
    ]);

    res.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      words: words.map((w) => ({
        ...w,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      })),
      relations,
      srsCards: srsCards.map((c) => ({
        ...c,
        due: c.due.toISOString(),
        lastReview: c.lastReview?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
