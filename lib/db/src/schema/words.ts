import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { wordsTable } from "./tables";

export { wordsTable, wordRelationsTable } from "./tables";

export const insertWordSchema = createInsertSchema(wordsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWord = z.infer<typeof insertWordSchema>;
export type Word = typeof wordsTable.$inferSelect;
