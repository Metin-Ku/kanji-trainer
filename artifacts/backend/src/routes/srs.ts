import { Router } from "express";
import { Rating } from "ts-fsrs";
import { srsDeckTypes, type SrsDeckType } from "@workspace/db";
import {
  previewIntervals,
  reviewCard,
  type ReviewRating,
} from "../lib/srs";
import {
  backfillAllSrsCards,
  getDeckStats,
  getReviewQueue,
  getSrsCardById,
  mapSrsRow,
  updateSrsCard,
  type SrsSortMode,
} from "../lib/srsCards";
import {
  recordMistake,
  recordSuccess,
} from "../lib/wordMistakes";
import {
  getStudiedWords,
  isValidDateKey,
  recordSrsReviewLog,
} from "../lib/srsReviewLog";
import { getUserId } from "../middleware/auth";

const router = Router();

const RATING_MAP: Record<number, ReviewRating> = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
};

function parseDeckType(value: string): SrsDeckType | null {
  return (srsDeckTypes as readonly string[]).includes(value)
    ? (value as SrsDeckType)
    : null;
}

router.post("/srs/sync", async (req, res, next) => {
  try {
    await backfillAllSrsCards(getUserId(req));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/srs/decks", async (req, res, next) => {
  try {
    await backfillAllSrsCards(getUserId(req));
    const stats = await Promise.all(
      srsDeckTypes.map(async (deckType) => ({
        deckType,
        ...(await getDeckStats(deckType, getUserId(req))),
      })),
    );
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.get("/srs/queue", async (req, res, next) => {
  try {
    const deckType = parseDeckType(String(req.query.deck ?? ""));
    if (!deckType) {
      res.status(400).json({ error: "Invalid deck type" });
      return;
    }

    const sort = (req.query.sort as SrsSortMode | undefined) ?? "due-asc";
    const jlptMin = req.query.jlptMin ? String(req.query.jlptMin) : null;
    const jlptMax = req.query.jlptMax ? String(req.query.jlptMax) : null;
    const wordIdsRaw = req.query.wordIds ? String(req.query.wordIds) : "";
    const wordIds = wordIdsRaw
      ? wordIdsRaw
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0)
      : undefined;
    const ignoreDue =
      req.query.ignoreDue === "1" || req.query.ignoreDue === "true";

    const queue = await getReviewQueue(deckType, {
      jlptMin,
      jlptMax,
      sort,
      wordIds,
      ignoreDue,
      userId: getUserId(req),
    });
    const now = new Date();

    res.json(
      queue.map(({ card, word }) => ({
        card: {
          ...card,
          due: card.due.toISOString(),
          lastReview: card.lastReview?.toISOString() ?? null,
          createdAt: card.createdAt.toISOString(),
          updatedAt: card.updatedAt.toISOString(),
          exampleCursor: card.exampleCursor,
          intervals: previewIntervals(card, now),
        },
        word: {
          ...word,
          srsExamples: word.srsExamples ?? [],
          createdAt: word.createdAt.toISOString(),
          updatedAt: word.updatedAt.toISOString(),
          relatedWordIds: [],
        },
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/srs/studied-words", async (req, res, next) => {
  try {
    const deck = parseDeckType(String(req.query.deck ?? ""));
    if (!deck) {
      res.status(400).json({ error: "Invalid deck" });
      return;
    }
    const from =
      typeof req.query.from === "string" && isValidDateKey(req.query.from)
        ? req.query.from
        : undefined;
    const to =
      typeof req.query.to === "string" && isValidDateKey(req.query.to)
        ? req.query.to
        : undefined;
    if (!from && !to) {
      res.status(400).json({ error: "from or to date required" });
      return;
    }

    const words = await getStudiedWords(getUserId(req), deck, from, to);
    res.json(
      words.map((w) => ({
        ...w,
        createdAt: w.createdAt.toISOString(),
        relatedWordIds: [],
        categoryIds: [],
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.post("/srs/cards/:id/review", async (req, res, next) => {
  try {
    const cardId = Number(req.params.id);
    const ratingNum = Number(req.body?.rating);
    const correct = req.body?.correct;
    let rating = RATING_MAP[ratingNum];

    const row = await getSrsCardById(cardId, getUserId(req));
    if (!row) {
      res.status(404).json({ error: "Card not found" });
      return;
    }

    if (row.card.deckType === "example") {
      if (typeof correct === "boolean") {
        rating = correct ? Rating.Good : Rating.Again;
      } else if (!rating) {
        res.status(400).json({ error: "Invalid rating or correct flag" });
        return;
      }
    } else if (!rating) {
      res.status(400).json({ error: "Invalid rating (1=Again, 2=Hard, 3=Good, 4=Easy)" });
      return;
    }

    const now = new Date();
    const mapped = mapSrsRow(row.card);
    const { fields } = reviewCard(mapped, rating, now);

    let exampleCursor: number | undefined;
    if (row.card.deckType === "example" && correct === true) {
      const examples = row.word.srsExamples ?? [];
      if (examples.length > 0) {
        const cursor = mapped.exampleCursor ?? 0;
        exampleCursor = (cursor + 1) % examples.length;
      }
    }

    const updated = await updateSrsCard(cardId, getUserId(req), {
      ...fields,
      ...(exampleCursor !== undefined ? { exampleCursor } : {}),
    });

    if (!updated) {
      res.status(404).json({ error: "Card not found" });
      return;
    }

    const deckType = row.card.deckType as SrsDeckType;
    const dateKey =
      typeof req.body?.date === "string" ? req.body.date : undefined;
    if (dateKey && isValidDateKey(dateKey)) {
      try {
        await recordSrsReviewLog(
          getUserId(req),
          row.word.id,
          deckType,
          dateKey,
          now,
        );
      } catch {
        // Non-fatal
      }
    }

    try {
      if (deckType === "example") {
        if (correct === true) {
          await recordSuccess(row.word.id, deckType);
        } else if (correct === false) {
          await recordMistake(row.word.id, deckType);
        }
      } else if (rating === Rating.Again) {
        await recordMistake(row.word.id, deckType);
      } else if (rating === Rating.Good || rating === Rating.Easy) {
        await recordSuccess(row.word.id, deckType);
      }
    } catch {
      // Non-fatal: review already persisted
    }

    res.json({
      card: {
        ...updated,
        due: updated.due.toISOString(),
        lastReview: updated.lastReview?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        exampleCursor: updated.exampleCursor,
        intervals: previewIntervals(updated, now),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
