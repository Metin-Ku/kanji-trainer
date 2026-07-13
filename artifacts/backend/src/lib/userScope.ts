import { eq, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

/** Rows owned by the given user only. */
export function ownerOnly(userId: number, column: AnyColumn): SQL {
  return eq(column, userId);
}

/** @deprecated Use ownerOnly — legacy null rows should be migrated via db:assign-owner */
export const ownerOrLegacy = ownerOnly;
