import type { SrsDeckType, SrsQueueItem, SrsSortMode } from "../types/srs";

interface SrsSession {
  deck: SrsDeckType;
  items: SrsQueueItem[];
  title: string;
  backPath: string;
  jlptMin: string | null;
  jlptMax: string | null;
  sort: SrsSortMode;
}

let session: SrsSession = {
  deck: "word",
  items: [],
  title: "",
  backPath: "/srs",
  jlptMin: null,
  jlptMax: null,
  sort: "due-asc",
};

export function startSrsSession(
  deck: SrsDeckType,
  items: SrsQueueItem[],
  title: string,
  backPath: string,
  filters: { jlptMin: string | null; jlptMax: string | null; sort: SrsSortMode },
) {
  session = { deck, items, title, backPath, ...filters };
}

export function getSrsSession(): SrsSession {
  return session;
}
