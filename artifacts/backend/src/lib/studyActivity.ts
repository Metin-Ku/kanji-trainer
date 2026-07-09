import {
  db,
  srsDeckTypes,
  studyActivityTable,
  type SrsDeckType,
} from "@workspace/db";
import { sql } from "drizzle-orm";

export type ActivityByDate = Record<
  string,
  Partial<Record<SrsDeckType, number>>
>;

function normalizeActivityRow(
  date: string,
  deckType: string,
  count: number,
  out: ActivityByDate,
): void {
  if (!(srsDeckTypes as readonly string[]).includes(deckType) || count <= 0) {
    return;
  }
  const deck = deckType as SrsDeckType;
  const day = out[date] ?? {};
  day[deck] = count;
  out[date] = day;
}

export async function getActivityByDate(): Promise<ActivityByDate> {
  const rows = await db
    .select()
    .from(studyActivityTable)
    .orderBy(studyActivityTable.date);

  const out: ActivityByDate = {};
  for (const row of rows) {
    normalizeActivityRow(row.date, row.deckType, row.count, out);
  }
  return out;
}

export async function incrementStudyUnit(
  deckType: SrsDeckType,
  date: string,
  units = 1,
): Promise<void> {
  if (units <= 0) return;

  await db
    .insert(studyActivityTable)
    .values({ date, deckType, count: units })
    .onConflictDoUpdate({
      target: [studyActivityTable.date, studyActivityTable.deckType],
      set: {
        count: sql`${studyActivityTable.count} + ${units}`,
      },
    });
}

export async function importActivityByDate(
  activityByDate: ActivityByDate,
): Promise<void> {
  for (const [date, decks] of Object.entries(activityByDate)) {
    if (!decks || typeof decks !== "object") continue;
    for (const deck of srsDeckTypes) {
      const count = decks[deck];
      if (typeof count !== "number" || count <= 0) continue;

      await db
        .insert(studyActivityTable)
        .values({ date, deckType: deck, count })
        .onConflictDoUpdate({
          target: [studyActivityTable.date, studyActivityTable.deckType],
          set: {
            count: sql`GREATEST(${studyActivityTable.count}, ${count})`,
          },
        });
    }
  }
}
