import { Router } from "express";
import {
  db,
  categoriesTable,
  categoryWordsTable,
  wordsTable,
} from "@workspace/db";
import { asc, eq, inArray, count, sql, and } from "drizzle-orm";
import { CATEGORY_SEED } from "../lib/categorySeed";
import { getUserId } from "../middleware/auth";
import { ownerOnly } from "../lib/userScope";

const router = Router();

function parseIconSvg(raw: unknown): string | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  return value || null;
}

function categorySummaryDto(
  category: typeof categoriesTable.$inferSelect,
  wordCount: number,
) {
  return {
    id: category.id,
    name: category.name,
    iconSvg: category.iconSvg,
    sortOrder: category.sortOrder,
    wordCount,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function categoryDetailDto(
  category: typeof categoriesTable.$inferSelect,
  wordIds: number[],
) {
  return {
    id: category.id,
    name: category.name,
    iconSvg: category.iconSvg,
    sortOrder: category.sortOrder,
    wordIds,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

async function getCategoryWordIds(categoryId: number): Promise<number[]> {
  const rows = await db
    .select({ wordId: categoryWordsTable.wordId })
    .from(categoryWordsTable)
    .where(eq(categoryWordsTable.categoryId, categoryId))
    .orderBy(asc(categoryWordsTable.sortOrder), asc(categoryWordsTable.wordId));
  return rows.map((r) => r.wordId);
}

router.post("/categories", async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const iconSvg = parseIconSvg(req.body?.iconSvg);

    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`coalesce(max(${categoriesTable.sortOrder}), -1)` })
      .from(categoriesTable)
      .where(ownerOnly(getUserId(req), categoriesTable.userId));

    const [category] = await db
      .insert(categoriesTable)
      .values({
        userId: getUserId(req),
        name,
        iconSvg,
        sortOrder: Number(maxOrder) + 1,
      })
      .returning();

    res.status(201).json(categorySummaryDto(category, 0));
  } catch (err) {
    next(err);
  }
});

router.get("/categories", async (req, res, next) => {
  try {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(ownerOnly(getUserId(req), categoriesTable.userId))
      .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id));

    const counts = await db
      .select({
        categoryId: categoryWordsTable.categoryId,
        wordCount: count(),
      })
      .from(categoryWordsTable)
      .groupBy(categoryWordsTable.categoryId);

    const countMap = new Map(
      counts.map((c) => [c.categoryId, Number(c.wordCount)]),
    );

    res.json(
      categories.map((c) => categorySummaryDto(c, countMap.get(c.id) ?? 0)),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/categories/:id", async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);
    const [category] = await db
      .select()
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.id, categoryId),
          ownerOnly(getUserId(req), categoriesTable.userId),
        ),
      );
    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    const wordIds = await getCategoryWordIds(categoryId);
    res.json(categoryDetailDto(category, wordIds));
  } catch (err) {
    next(err);
  }
});

router.patch("/categories/:id", async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);
    const name =
      req.body?.name !== undefined ? String(req.body.name).trim() : undefined;
    const iconSvg =
      req.body?.iconSvg !== undefined
        ? parseIconSvg(req.body.iconSvg)
        : undefined;

    if (name !== undefined && !name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    if (name === undefined && iconSvg === undefined) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const patch: { name?: string; iconSvg?: string | null } = {};
    if (name !== undefined) patch.name = name;
    if (iconSvg !== undefined) patch.iconSvg = iconSvg;

    const [category] = await db
      .update(categoriesTable)
      .set(patch)
      .where(
        and(
          eq(categoriesTable.id, categoryId),
          ownerOnly(getUserId(req), categoriesTable.userId),
        ),
      )
      .returning();

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    const wordIds = await getCategoryWordIds(categoryId);
    res.json(categoryDetailDto(category, wordIds));
  } catch (err) {
    next(err);
  }
});

router.delete("/categories/:id", async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);

    const [category] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.id, categoryId),
          ownerOnly(getUserId(req), categoriesTable.userId),
        ),
      );

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    await db
      .delete(categoryWordsTable)
      .where(eq(categoryWordsTable.categoryId, categoryId));
    await db
      .delete(categoriesTable)
      .where(
        and(
          eq(categoriesTable.id, categoryId),
          ownerOnly(getUserId(req), categoriesTable.userId),
        ),
      );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/categories/seed", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const existingWords = await db
      .select({ id: wordsTable.id })
      .from(wordsTable)
      .where(ownerOnly(userId, wordsTable.userId));
    const validWordIds = new Set(existingWords.map((w) => w.id));

    const ownedCategories = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(ownerOnly(userId, categoriesTable.userId));
    const ownedIds = ownedCategories.map((c) => c.id);

    if (ownedIds.length > 0) {
      await db
        .delete(categoryWordsTable)
        .where(inArray(categoryWordsTable.categoryId, ownedIds));
      await db
        .delete(categoriesTable)
        .where(ownerOnly(userId, categoriesTable.userId));
    }

    let categoriesCreated = 0;
    let linksCreated = 0;
    const skippedWordIds: number[] = [];

    for (let i = 0; i < CATEGORY_SEED.length; i++) {
      const item = CATEGORY_SEED[i]!;
      const [category] = await db
        .insert(categoriesTable)
        .values({ userId, name: item.name, sortOrder: i })
        .returning();
      categoriesCreated++;

      const links: { categoryId: number; wordId: number; sortOrder: number }[] =
        [];
      item.wordIds.forEach((wordId, sortOrder) => {
        if (!validWordIds.has(wordId)) {
          if (!skippedWordIds.includes(wordId)) skippedWordIds.push(wordId);
          return;
        }
        links.push({ categoryId: category.id, wordId, sortOrder });
      });

      if (links.length > 0) {
        await db.insert(categoryWordsTable).values(links);
        linksCreated += links.length;
      }
    }

    res.json({
      ok: true,
      categoriesCreated,
      linksCreated,
      skippedWordIds,
    });
  } catch (err) {
    next(err);
  }
});

router.put("/categories/:id/words", async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);
    const wordIds = Array.isArray(req.body?.wordIds)
      ? (req.body.wordIds as unknown[])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      : null;

    if (!wordIds) {
      res.status(400).json({ error: "wordIds array required" });
      return;
    }

    const [category] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.id, categoryId),
          ownerOnly(getUserId(req), categoriesTable.userId),
        ),
      );
    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    if (wordIds.length > 0) {
      const existing = await db
        .select({ id: wordsTable.id })
        .from(wordsTable)
        .where(
          and(
            inArray(wordsTable.id, wordIds),
            ownerOnly(getUserId(req), wordsTable.userId),
          ),
        );
      const valid = new Set(existing.map((w) => w.id));
      const unique = [...new Set(wordIds.filter((id) => valid.has(id)))];

      await db
        .delete(categoryWordsTable)
        .where(eq(categoryWordsTable.categoryId, categoryId));

      if (unique.length > 0) {
        await db.insert(categoryWordsTable).values(
          unique.map((wordId, sortOrder) => ({
            categoryId,
            wordId,
            sortOrder,
          })),
        );
      }
    } else {
      await db
        .delete(categoryWordsTable)
        .where(eq(categoryWordsTable.categoryId, categoryId));
    }

    const updatedWordIds = await getCategoryWordIds(categoryId);
    res.json({ wordIds: updatedWordIds });
  } catch (err) {
    next(err);
  }
});

export default router;
