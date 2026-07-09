import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "./load-env.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(resolve(root, ".env"));

const { db, categoriesTable, categoryWordsTable, wordsTable } = await import(
  "../lib/db/src/index.ts"
);
const { CATEGORY_SEED } = await import(
  "../artifacts/backend/src/lib/categorySeed.ts"
);

async function main() {
  const existingWords = await db.select({ id: wordsTable.id }).from(wordsTable);
  const validWordIds = new Set(existingWords.map((w) => w.id));

  await db.delete(categoryWordsTable);
  await db.delete(categoriesTable);

  let categoriesCreated = 0;
  let linksCreated = 0;
  const skippedWordIds: number[] = [];

  for (let i = 0; i < CATEGORY_SEED.length; i++) {
    const item = CATEGORY_SEED[i]!;
    const [category] = await db
      .insert(categoriesTable)
      .values({ name: item.name, sortOrder: i })
      .returning();
    categoriesCreated++;

    const links: { categoryId: number; wordId: number; sortOrder: number }[] =
      [];
    item.wordIds.forEach((wordId, sortOrder) => {
      if (!validWordIds.has(wordId)) {
        if (!skippedWordIds.includes(wordId)) skippedWordIds.push(wordId);
        return;
      }
      links.push({ categoryId: category.id, wordId, sortOrder });
    });

    if (links.length > 0) {
      await db.insert(categoryWordsTable).values(links);
      linksCreated += links.length;
    }
  }

  console.log(
    JSON.stringify({ ok: true, categoriesCreated, linksCreated, skippedWordIds }, null, 2),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
