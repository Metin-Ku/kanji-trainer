import { Router } from "express";
import {
  db,
  wordsTable,
  wordRelationsTable,
  srsCardsTable,
  studyActivityTable,
  categoriesTable,
  categoryWordsTable,
} from "@workspace/db";

const router = Router();

router.get("/backup", async (_req, res, next) => {
  try {
    const [words, relations, srsCards, studyActivity, categories, categoryWords] =
      await Promise.all([
      db.select().from(wordsTable).orderBy(wordsTable.id),
      db.select().from(wordRelationsTable),
      db.select().from(srsCardsTable).orderBy(srsCardsTable.id),
      db.select().from(studyActivityTable).orderBy(studyActivityTable.date),
      db.select().from(categoriesTable).orderBy(categoriesTable.id),
      db.select().from(categoryWordsTable),
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
      studyActivity,
      categories,
      categoryWords,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
