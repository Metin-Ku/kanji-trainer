import { eq, or, isNull, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

/** Rows owned by user or legacy rows without user_id (pre-migration). */
export function ownerOrLegacy(userId: number, column: AnyColumn): SQL {
  return or(eq(column, userId), isNull(column))!;
}

export function ownerOnly(userId: number, column: AnyColumn): SQL {
  return eq(column, userId);
}
