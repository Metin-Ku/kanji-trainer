import { Word } from "../types";

const KANJI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/;

function extractKanji(str: string): string[] {
  return [...str].filter((c) => KANJI_RE.test(c));
}

export function clusterByKanji(
  words: Word[],
  comparator?: (a: Word, b: Word) => number,
): Word[] {
  if (words.length === 0) return [];

  const n = words.length;

  const parent = Array.from({ length: n }, (_, i) => i);
  const rank = new Array(n).fill(0);

  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(x: number, y: number) {
    const px = find(x), py = find(y);
    if (px === py) return;
    if (rank[px] < rank[py]) parent[px] = py;
    else if (rank[px] > rank[py]) parent[py] = px;
    else { parent[py] = px; rank[px]++; }
  }

  const kanjiToIndices = new Map<string, number[]>();
  words.forEach((w, i) => {
    for (const k of extractKanji(w.kanji)) {
      if (!kanjiToIndices.has(k)) kanjiToIndices.set(k, []);
      kanjiToIndices.get(k)!.push(i);
    }
  });

  for (const indices of kanjiToIndices.values()) {
    for (let j = 1; j < indices.length; j++) {
      union(indices[0], indices[j]);
    }
  }

  const components = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!components.has(root)) components.set(root, []);
    components.get(root)!.push(i);
  }

  const sortedClusters = [...components.values()]
    .map((indices) =>
      indices.sort((a, b) =>
        comparator
          ? (comparator(words[a], words[b]) || words[a].kanji.localeCompare(words[b].kanji))
          : words[a].kanji.localeCompare(words[b].kanji)
      )
    )
    .sort((a, b) => words[a[0]].kanji.localeCompare(words[b[0]].kanji));

  return sortedClusters.flat().map((i) => words[i]);
}
