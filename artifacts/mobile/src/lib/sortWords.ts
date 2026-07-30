import type { Word } from "./types";
import type { WordCardMode } from "@/components/WordCard";
import { clusterByKanji } from "./kanjiCluster";

export type SortMode =
  | "level-asc"
  | "level-desc"
  | "date-asc"
  | "date-desc"
  | "jlpt-asc"
  | "jlpt-desc"
  | "kanji-cluster";

export type SortGroup = "jlptOrder" | "level" | "date" | "kanji";

const JLPT_RANK: Record<string, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };

function jlptRank(w: Word): number {
  return w.jlptLevel ? (JLPT_RANK[w.jlptLevel] ?? 99) : 99;
}

function levelField(w: Word, mode: WordCardMode): number {
  if (mode === "pronunciation") return w.pronLevel;
  if (mode === "meaning") return w.meaningLevel;
  return w.level;
}

function buildComparator(
  sorts: Set<SortMode>,
  mode: WordCardMode,
): ((a: Word, b: Word) => number) | undefined {
  const levelDir = sorts.has("level-asc")
    ? "asc"
    : sorts.has("level-desc")
      ? "desc"
      : null;
  const dateDir = sorts.has("date-asc")
    ? "asc"
    : sorts.has("date-desc")
      ? "desc"
      : null;
  const jlptDir = sorts.has("jlpt-asc")
    ? "asc"
    : sorts.has("jlpt-desc")
      ? "desc"
      : null;
  if (!levelDir && !dateDir && !jlptDir) return undefined;
  const lv = (w: Word) => levelField(w, mode);
  return (a: Word, b: Word) => {
    if (jlptDir) {
      const d = jlptRank(a) - jlptRank(b);
      if (d !== 0) return jlptDir === "asc" ? d : -d;
    }
    if (levelDir) {
      const d = lv(a) - lv(b);
      if (d !== 0) return levelDir === "asc" ? d : -d;
    }
    if (dateDir) {
      const d =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (d !== 0) return dateDir === "asc" ? d : -d;
    }
    return 0;
  };
}

export function sortWordsMulti(
  words: Word[],
  sorts: Set<SortMode>,
  mode: WordCardMode = "words",
): Word[] {
  const cmp = buildComparator(sorts, mode);
  if (sorts.has("kanji-cluster")) return clusterByKanji(words, cmp);
  const arr = [...words];
  if (!cmp) return arr;
  return arr.sort(cmp);
}

export function sortWords(
  words: Word[],
  sort: SortMode,
  mode: WordCardMode = "words",
): Word[] {
  const arr = [...words];
  const lv = (w: Word) => levelField(w, mode);

  if (sort === "jlpt-asc")
    return arr.sort((a, b) => jlptRank(a) - jlptRank(b) || lv(a) - lv(b));
  if (sort === "jlpt-desc")
    return arr.sort((a, b) => jlptRank(b) - jlptRank(a) || lv(a) - lv(b));
  if (sort === "level-asc")
    return arr.sort(
      (a, b) =>
        lv(a) - lv(b) ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  if (sort === "level-desc")
    return arr.sort(
      (a, b) =>
        lv(b) - lv(a) ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  if (sort === "date-asc")
    return arr.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  if (sort === "date-desc")
    return arr.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  if (sort === "kanji-cluster") return clusterByKanji(arr);
  return arr;
}
