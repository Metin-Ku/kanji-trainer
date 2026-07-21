import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiOrigin";
import type { Word } from "../types";
import type { SrsDeckType } from "../types/srs";
import type { StudiedWordsDateRange } from "../lib/studiedWordsDate";
import { isRangeValid, normalizeRange } from "../lib/studiedWordsDate";

export function useStudiedWords(
  deck: SrsDeckType,
  range: StudiedWordsDateRange,
) {
  const normalized = normalizeRange(range);
  const enabled = isRangeValid(normalized);

  return useQuery({
    queryKey: [
      "srs",
      "studied-words",
      deck,
      normalized.from ?? "",
      normalized.to ?? "",
    ],
    queryFn: async (): Promise<Word[]> => {
      const params = new URLSearchParams({ deck });
      if (normalized.from) params.set("from", normalized.from);
      if (normalized.to) params.set("to", normalized.to);
      const res = await apiFetch(`/api/srs/studied-words?${params}`);
      if (!res.ok) throw new Error("Failed to load studied words");
      return res.json();
    },
    enabled,
    staleTime: 60_000,
  });
}
