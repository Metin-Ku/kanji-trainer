import type { SrsDeckType, SrsQueueItem, SrsSortMode } from "@/types/srs";

interface SrsSession {
  deck: SrsDeckType;
  items: SrsQueueItem[];
  title: string;
  backPath: string;
  jlptLevels: string[];
  sort: SrsSortMode;
}

let session: SrsSession = {
  deck: "word",
  items: [],
  title: "",
  backPath: "/srs",
  jlptLevels: [],
  sort: "jlpt-asc",
};

export function startSrsSession(
  deck: SrsDeckType,
  items: SrsQueueItem[],
  title: string,
  backPath: string,
  filters: { jlptLevels: string[]; sort: SrsSortMode },
) {
  session = { deck, items, title, backPath, ...filters };
}

export function getSrsSession(): SrsSession {
  return session;
}

export function clearSrsSession() {
  session = {
    deck: "word",
    items: [],
    title: "",
    backPath: "/srs",
    jlptLevels: [],
    sort: "jlpt-asc",
  };
}
