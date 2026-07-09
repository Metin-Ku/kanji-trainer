import { Router } from "express";
import { srsDeckTypes, type SrsDeckType } from "@workspace/db";
import {
  getActivityByDate,
  importActivityByDate,
  incrementStudyUnit,
  type ActivityByDate,
} from "../lib/studyActivity";

const router = Router();

function parseDeckType(value: unknown): SrsDeckType | null {
  return typeof value === "string" &&
    (srsDeckTypes as readonly string[]).includes(value)
    ? (value as SrsDeckType)
    : null;
}

function parseActivityByDate(raw: unknown): ActivityByDate | null {
  if (!raw || typeof raw !== "object") return null;
  const activityByDate = raw as ActivityByDate;
  const out: ActivityByDate = {};

  for (const [date, value] of Object.entries(activityByDate)) {
    if (!value || typeof value !== "object") continue;
    const deckCounts: Partial<Record<SrsDeckType, number>> = {};
    for (const deck of srsDeckTypes) {
      const count = (value as Record<string, unknown>)[deck];
      if (typeof count === "number" && count > 0) {
        deckCounts[deck] = count;
      }
    }
    if (Object.keys(deckCounts).length > 0) {
      out[date] = deckCounts;
    }
  }

  return out;
}

router.get("/study-activity", async (_req, res, next) => {
  try {
    const activityByDate = await getActivityByDate();
    res.json({ activityByDate });
  } catch (err) {
    next(err);
  }
});

router.post("/study-activity/increment", async (req, res, next) => {
  try {
    const deckType = parseDeckType(req.body?.deck);
    const date =
      typeof req.body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date)
        ? req.body.date
        : null;
    const units = Number(req.body?.units ?? 1);

    if (!deckType || !date || !Number.isFinite(units) || units <= 0) {
      res.status(400).json({ error: "Invalid deck, date, or units" });
      return;
    }

    await incrementStudyUnit(deckType, date, Math.round(units));
    const activityByDate = await getActivityByDate();
    res.json({ activityByDate });
  } catch (err) {
    next(err);
  }
});

router.post("/study-activity/import", async (req, res, next) => {
  try {
    const activityByDate = parseActivityByDate(req.body?.activityByDate);
    if (!activityByDate) {
      res.status(400).json({ error: "Invalid activityByDate" });
      return;
    }

    await importActivityByDate(activityByDate);
    const merged = await getActivityByDate();
    res.json({ activityByDate: merged });
  } catch (err) {
    next(err);
  }
});

export default router;
