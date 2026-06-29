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

router.post("/srs/sync", async (_req, res, next) => {
  try {
    await backfillAllSrsCards();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/srs/decks", async (_req, res, next) => {
  try {
    await backfillAllSrsCards();
    const stats = await Promise.all(
      srsDeckTypes.map(async (deckType) => ({
        deckType,
        ...(await getDeckStats(deckType)),
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

    const queue = await getReviewQueue(deckType, { jlptMin, jlptMax, sort });
    const now = new Date();

    res.json(
      queue.map(({ card, word }) => ({
        card: {
          ...card,
          due: card.due.toISOString(),
          lastReview: card.lastReview?.toISOString() ?? null,
          createdAt: card.createdAt.toISOString(),
          updatedAt: card.updatedAt.toISOString(),
          intervals: previewIntervals(card, now),
        },
        word: {
          ...word,
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

router.post("/srs/cards/:id/review", async (req, res, next) => {
  try {
    const cardId = Number(req.params.id);
    const ratingNum = Number(req.body?.rating);
    const rating = RATING_MAP[ratingNum];

    if (!rating) {
      res.status(400).json({ error: "Invalid rating (1=Again, 2=Hard, 3=Good, 4=Easy)" });
      return;
    }

    const row = await getSrsCardById(cardId);
    if (!row) {
      res.status(404).json({ error: "Card not found" });
      return;
    }

    const now = new Date();
    const mapped = mapSrsRow(row.card);
    const { fields } = reviewCard(mapped, rating, now);
    const updated = await updateSrsCard(cardId, fields);

    if (!updated) {
      res.status(404).json({ error: "Card not found" });
      return;
    }

    res.json({
      card: {
        ...updated,
        due: updated.due.toISOString(),
        lastReview: updated.lastReview?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        intervals: previewIntervals(updated, now),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
