import { Router } from "express";
import { srsDeckTypes, type SrsDeckType } from "@workspace/db";
import {
  countUniqueTroubleWords,
  dismissMistake,
  listTroubleWords,
} from "../lib/wordMistakes";

const router = Router();

function parseDeckType(value: string): SrsDeckType | null {
  return (srsDeckTypes as readonly string[]).includes(value)
    ? (value as SrsDeckType)
    : null;
}

router.get("/trouble-words", async (req, res, next) => {
  try {
    const deckParam = req.query.deck ? String(req.query.deck) : null;
    const deck = deckParam ? parseDeckType(deckParam) : null;
    if (deckParam && !deck) {
      res.status(400).json({ error: "Invalid deck type" });
      return;
    }

    const minCount = Math.max(1, Number(req.query.minCount) || 1);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 500));

    const [items, totalWords] = await Promise.all([
      listTroubleWords({ deck, minCount, limit }),
      countUniqueTroubleWords(minCount),
    ]);

    res.json({ items, totalWords });
  } catch (err) {
    next(err);
  }
});

router.delete("/trouble-words/:wordId/:deckType", async (req, res, next) => {
  try {
    const wordId = Number(req.params.wordId);
    const deckType = parseDeckType(String(req.params.deckType));
    if (!Number.isFinite(wordId) || wordId <= 0 || !deckType) {
      res.status(400).json({ error: "Invalid word or deck type" });
      return;
    }

    await dismissMistake(wordId, deckType);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/trouble-words/:wordId", async (req, res, next) => {
  try {
    const wordId = Number(req.params.wordId);
    if (!Number.isFinite(wordId) || wordId <= 0) {
      res.status(400).json({ error: "Invalid word id" });
      return;
    }

    await dismissMistake(wordId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
