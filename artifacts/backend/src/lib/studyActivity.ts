import {
  db,
  srsDeckTypes,
  studyActivityTable,
  type SrsDeckType,
} from "@workspace/db";
import { and, eq, isNull, or, sql } from "drizzle-orm";

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

function userActivityFilter(userId: number) {
  return or(
    eq(studyActivityTable.userId, userId),
    isNull(studyActivityTable.userId),
  );
}

export async function getActivityByDate(
  userId: number,
): Promise<ActivityByDate> {
  const rows = await db
    .select()
    .from(studyActivityTable)
    .where(userActivityFilter(userId))
    .orderBy(studyActivityTable.date);

  const out: ActivityByDate = {};
  for (const row of rows) {
    normalizeActivityRow(row.date, row.deckType, row.count, out);
  }
  return out;
}

export async function incrementStudyUnit(
  userId: number,
  deckType: SrsDeckType,
  date: string,
  units = 1,
): Promise<void> {
  if (units <= 0) return;

  await db
    .insert(studyActivityTable)
    .values({ userId, date, deckType, count: units })
    .onConflictDoUpdate({
      target: [
        studyActivityTable.userId,
        studyActivityTable.date,
        studyActivityTable.deckType,
      ],
      set: {
        count: sql`${studyActivityTable.count} + ${units}`,
      },
    });
}

export async function importActivityByDate(
  userId: number,
  activityByDate: ActivityByDate,
): Promise<void> {
  for (const [date, decks] of Object.entries(activityByDate)) {
    if (!decks || typeof decks !== "object") continue;
    for (const deck of srsDeckTypes) {
      const count = decks[deck];
      if (typeof count !== "number" || count <= 0) continue;

      await db
        .insert(studyActivityTable)
        .values({ userId, date, deckType: deck, count })
        .onConflictDoUpdate({
          target: [
            studyActivityTable.userId,
            studyActivityTable.date,
            studyActivityTable.deckType,
          ],
          set: {
            count: sql`GREATEST(${studyActivityTable.count}, ${count})`,
          },
        });
    }
  }
}

/** Reassign legacy rows without user_id to the given user. */
export async function claimOrphanStudyActivity(userId: number): Promise<void> {
  await db
    .update(studyActivityTable)
    .set({ userId })
    .where(isNull(studyActivityTable.userId));
}
