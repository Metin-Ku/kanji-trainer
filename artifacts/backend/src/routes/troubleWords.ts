import { Router } from "express";
import { srsDeckTypes, type SrsDeckType } from "@workspace/db";
import {
  countUniqueTroubleWords,
  dismissMistake,
  listTroubleWords,
} from "../lib/wordMistakes";
import { getUserId } from "../middleware/auth";

const router = Router();

function parseDeckType(value: string): SrsDeckType | null {
  return (srsDeckTypes as readonly string[]).includes(value)
    ? (value as SrsDeckType)
    : null;
}

router.get("/trouble-words", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const deckParam = req.query.deck ? String(req.query.deck) : null;
    const deck = deckParam ? parseDeckType(deckParam) : null;
    if (deckParam && !deck) {
      res.status(400).json({ error: "Invalid deck type" });
      return;
    }

    const minCount = Math.max(1, Number(req.query.minCount) || 1);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 500));

    const [items, totalWords] = await Promise.all([
      listTroubleWords({ userId, deck, minCount, limit }),
      countUniqueTroubleWords(userId, minCount),
    ]);

    res.json({ items, totalWords });
  } catch (err) {
    next(err);
  }
});

router.delete("/trouble-words/:wordId/:deckType", async (req, res, next) => {
  try {
    const wordId = Number(req.params.wordId);
    const deckType = parseDeckType(req.params.deckType);
    if (!deckType) {
      res.status(400).json({ error: "Invalid deck type" });
      return;
    }

    await dismissMistake(wordId, deckType, getUserId(req));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/trouble-words/:wordId", async (req, res, next) => {
  try {
    const wordId = Number(req.params.wordId);
    await dismissMistake(wordId, undefined, getUserId(req));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
