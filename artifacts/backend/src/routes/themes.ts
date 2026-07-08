import { Router } from "express";
import {
  db,
  themesTable,
  themeWordsTable,
  themeQuizQuestionsTable,
  type SrsExampleHint,
  type ThemeQuizChoice,
} from "@workspace/db";
import { eq, asc, and, count } from "drizzle-orm";
import {
  CreateThemeBody,
  UpdateThemeBody,
  ReplaceThemeWordsBody,
  AddThemeWordsBody,
  ReplaceThemeQuestionsBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

function sanitizeHints(hints: SrsExampleHint[]): SrsExampleHint[] {
  return hints.map((h) => {
    const text = h.text.trim();
    const highlights = (h.highlights ?? [])
      .map((x) => x.trim())
      .filter((x) => x && text.includes(x));
    return highlights.length ? { text, highlights } : { text };
  });
}

function sanitizeQuestion(
  q: {
    sortOrder: number;
    type: string;
    prompt: string;
    choices: ThemeQuizChoice[];
    correctKey: string;
    hints: SrsExampleHint[];
  },
  index: number,
) {
  const type = q.type === "four" ? "four" : "ab";
  const keys = type === "ab" ? ["a", "b"] : ["1", "2", "3", "4"];
  const choices = keys.map((key) => {
    const found = q.choices.find((c) => c.key === key);
    return { key, label: (found?.label ?? "").trim() };
  });
  const correctKey = keys.includes(q.correctKey) ? q.correctKey : keys[0]!;
  return {
    sortOrder: q.sortOrder ?? index,
    type,
    prompt: q.prompt.trim(),
    choices,
    correctKey,
    hints: sanitizeHints(q.hints ?? []),
  };
}

async function getThemeWordIds(themeId: number): Promise<number[]> {
  const rows = await db
    .select({ wordId: themeWordsTable.wordId })
    .from(themeWordsTable)
    .where(eq(themeWordsTable.themeId, themeId))
    .orderBy(asc(themeWordsTable.sortOrder), asc(themeWordsTable.wordId));
  return rows.map((r) => r.wordId);
}

async function getThemeQuestions(themeId: number) {
  return db
    .select()
    .from(themeQuizQuestionsTable)
    .where(eq(themeQuizQuestionsTable.themeId, themeId))
    .orderBy(asc(themeQuizQuestionsTable.sortOrder), asc(themeQuizQuestionsTable.id));
}

async function buildThemeDetail(themeId: number) {
  const [theme] = await db
    .select()
    .from(themesTable)
    .where(eq(themesTable.id, themeId));
  if (!theme) return null;

  const wordIds = await getThemeWordIds(themeId);
  const questions = await getThemeQuestions(themeId);

  return {
    id: theme.id,
    name: theme.name,
    sortOrder: theme.sortOrder,
    wordIds,
    questions: questions.map((q) => ({
      id: q.id,
      sortOrder: q.sortOrder,
      type: q.type as "ab" | "four",
      prompt: q.prompt,
      choices: q.choices,
      correctKey: q.correctKey,
      hints: q.hints,
    })),
    createdAt: theme.createdAt.toISOString(),
    updatedAt: theme.updatedAt.toISOString(),
  };
}

async function themeExists(themeId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: themesTable.id })
    .from(themesTable)
    .where(eq(themesTable.id, themeId));
  return !!row;
}

async function setThemeWords(themeId: number, wordIds: number[]) {
  await db.delete(themeWordsTable).where(eq(themeWordsTable.themeId, themeId));
  const unique = [...new Set(wordIds)];
  if (unique.length === 0) return;
  await db.insert(themeWordsTable).values(
    unique.map((wordId, i) => ({
      themeId,
      wordId,
      sortOrder: i,
    })),
  );
}

async function appendThemeWords(themeId: number, wordIds: number[]) {
  const existing = await getThemeWordIds(themeId);
  const set = new Set(existing);
  const toAdd = wordIds.filter((id) => !set.has(id));
  if (toAdd.length === 0) return;
  const start = existing.length;
  await db.insert(themeWordsTable).values(
    toAdd.map((wordId, i) => ({
      themeId,
      wordId,
      sortOrder: start + i,
    })),
  );
}

router.get("/themes", async (_req, res, next) => {
  try {
    const themes = await db
      .select()
      .from(themesTable)
      .orderBy(asc(themesTable.sortOrder), asc(themesTable.id));

    const wordCounts = await db
      .select({
        themeId: themeWordsTable.themeId,
        wordCount: count(),
      })
      .from(themeWordsTable)
      .groupBy(themeWordsTable.themeId);

    const questionCounts = await db
      .select({
        themeId: themeQuizQuestionsTable.themeId,
        questionCount: count(),
      })
      .from(themeQuizQuestionsTable)
      .groupBy(themeQuizQuestionsTable.themeId);

    const wordMap = new Map(wordCounts.map((r) => [r.themeId, Number(r.wordCount)]));
    const qMap = new Map(questionCounts.map((r) => [r.themeId, Number(r.questionCount)]));

    res.json(
      themes.map((t) => ({
        id: t.id,
        name: t.name,
        sortOrder: t.sortOrder,
        wordCount: wordMap.get(t.id) ?? 0,
        questionCount: qMap.get(t.id) ?? 0,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    );
  } catch (err) {
    logger.error({ err }, "GET /themes failed");
    next(err);
  }
});

router.post("/themes", async (req, res, next) => {
  try {
    const parsed = CreateThemeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [theme] = await db
      .insert(themesTable)
      .values({ name: parsed.data.name.trim() })
      .returning();

    if (parsed.data.wordIds?.length) {
      await setThemeWords(theme!.id, parsed.data.wordIds);
    }

    const detail = await buildThemeDetail(theme!.id);
    res.status(201).json(detail);
  } catch (err) {
    logger.error({ err }, "POST /themes failed");
    next(err);
  }
});

router.get("/themes/:id", async (req, res, next) => {
  try {
    const themeId = Number(req.params.id);
    const detail = await buildThemeDetail(themeId);
    if (!detail) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(detail);
  } catch (err) {
    logger.error({ err }, "GET /themes/:id failed");
    next(err);
  }
});

router.patch("/themes/:id", async (req, res, next) => {
  try {
    const themeId = Number(req.params.id);
    const parsed = UpdateThemeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const patch: Partial<{ name: string; sortOrder: number; updatedAt: Date }> = {
      updatedAt: new Date(),
    };
    if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
    if (parsed.data.sortOrder !== undefined) patch.sortOrder = parsed.data.sortOrder;

    const [updated] = await db
      .update(themesTable)
      .set(patch)
      .where(eq(themesTable.id, themeId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const detail = await buildThemeDetail(themeId);
    res.json(detail);
  } catch (err) {
    logger.error({ err }, "PATCH /themes/:id failed");
    next(err);
  }
});

router.delete("/themes/:id", async (req, res, next) => {
  try {
    const themeId = Number(req.params.id);
    const [deleted] = await db
      .delete(themesTable)
      .where(eq(themesTable.id, themeId))
      .returning({ id: themesTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    logger.error({ err }, "DELETE /themes/:id failed");
    next(err);
  }
});

router.put("/themes/:id/words", async (req, res, next) => {
  try {
    const themeId = Number(req.params.id);
    const parsed = ReplaceThemeWordsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    if (!(await themeExists(themeId))) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await setThemeWords(themeId, parsed.data.wordIds);
    await db
      .update(themesTable)
      .set({ updatedAt: new Date() })
      .where(eq(themesTable.id, themeId));

    const detail = await buildThemeDetail(themeId);
    res.json(detail);
  } catch (err) {
    logger.error({ err }, "PUT /themes/:id/words failed");
    next(err);
  }
});

router.post("/themes/:id/words", async (req, res, next) => {
  try {
    const themeId = Number(req.params.id);
    const parsed = AddThemeWordsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    if (!(await themeExists(themeId))) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await appendThemeWords(themeId, parsed.data.wordIds);
    await db
      .update(themesTable)
      .set({ updatedAt: new Date() })
      .where(eq(themesTable.id, themeId));

    const detail = await buildThemeDetail(themeId);
    res.json(detail);
  } catch (err) {
    logger.error({ err }, "POST /themes/:id/words failed");
    next(err);
  }
});

router.delete("/themes/:id/words/:wordId", async (req, res, next) => {
  try {
    const themeId = Number(req.params.id);
    const wordId = Number(req.params.wordId);

    const [removed] = await db
      .delete(themeWordsTable)
      .where(and(eq(themeWordsTable.themeId, themeId), eq(themeWordsTable.wordId, wordId)))
      .returning();

    if (!removed) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db
      .update(themesTable)
      .set({ updatedAt: new Date() })
      .where(eq(themesTable.id, themeId));

    res.status(204).end();
  } catch (err) {
    logger.error({ err }, "DELETE /themes/:id/words/:wordId failed");
    next(err);
  }
});

router.get("/themes/:id/questions", async (req, res, next) => {
  try {
    const themeId = Number(req.params.id);
    if (!(await themeExists(themeId))) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const questions = await getThemeQuestions(themeId);
    res.json(
      questions.map((q) => ({
        id: q.id,
        sortOrder: q.sortOrder,
        type: q.type,
        prompt: q.prompt,
        choices: q.choices,
        correctKey: q.correctKey,
        hints: q.hints,
      })),
    );
  } catch (err) {
    logger.error({ err }, "GET /themes/:id/questions failed");
    next(err);
  }
});

router.put("/themes/:id/questions", async (req, res, next) => {
  try {
    const themeId = Number(req.params.id);
    const parsed = ReplaceThemeQuestionsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    if (!(await themeExists(themeId))) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db
      .delete(themeQuizQuestionsTable)
      .where(eq(themeQuizQuestionsTable.themeId, themeId));

    const rows = parsed.data.questions.map((q, i) =>
      sanitizeQuestion(q, i),
    );

    if (rows.length > 0) {
      await db.insert(themeQuizQuestionsTable).values(
        rows.map((q) => ({
          themeId,
          sortOrder: q.sortOrder,
          type: q.type,
          prompt: q.prompt,
          choices: q.choices,
          correctKey: q.correctKey,
          hints: q.hints,
        })),
      );
    }

    await db
      .update(themesTable)
      .set({ updatedAt: new Date() })
      .where(eq(themesTable.id, themeId));

    const questions = await getThemeQuestions(themeId);
    res.json(
      questions.map((q) => ({
        id: q.id,
        sortOrder: q.sortOrder,
        type: q.type,
        prompt: q.prompt,
        choices: q.choices,
        correctKey: q.correctKey,
        hints: q.hints,
      })),
    );
  } catch (err) {
    logger.error({ err }, "PUT /themes/:id/questions failed");
    next(err);
  }
});

export default router;
