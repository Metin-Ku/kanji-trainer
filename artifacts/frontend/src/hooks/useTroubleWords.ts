import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "../lib/apiOrigin";
import type { SrsDeckType } from "../types/srs";

export type TroubleDeckEntry = {
  deckType: SrsDeckType;
  mistakeCount: number;
  lastMistakeAt: string;
};

export type TroubleWord = {
  wordId: number;
  kanji: string;
  pronunciation: string;
  meaning: string;
  jlptLevel: string | null;
  decks: TroubleDeckEntry[];
  totalMistakes: number;
  lastMistakeAt: string;
};

export type TroubleWordsResponse = {
  items: TroubleWord[];
  totalWords: number;
};

export type TroubleDeckFilter = SrsDeckType | "all";

export function useTroubleWords(deckFilter: TroubleDeckFilter = "all") {
  return useQuery({
    queryKey: ["trouble-words", deckFilter],
    queryFn: async (): Promise<TroubleWordsResponse> => {
      const params = new URLSearchParams();
      if (deckFilter !== "all") params.set("deck", deckFilter);
      const qs = params.toString();
      const res = await fetch(apiUrl(`/api/trouble-words${qs ? `?${qs}` : ""}`));
      if (!res.ok) throw new Error("Failed to load trouble words");
      return res.json();
    },
  });
}

export function useTroubleWordCount() {
  return useQuery({
    queryKey: ["trouble-words", "count"],
    queryFn: async (): Promise<number> => {
      const res = await fetch(apiUrl("/api/trouble-words?limit=1"));
      if (!res.ok) throw new Error("Failed to load trouble word count");
      const data = (await res.json()) as TroubleWordsResponse;
      return data.totalWords;
    },
  });
}

export function useDismissTroubleWord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      wordId,
      deckType,
    }: {
      wordId: number;
      deckType?: SrsDeckType;
    }) => {
      const path = deckType
        ? `/api/trouble-words/${wordId}/${deckType}`
        : `/api/trouble-words/${wordId}`;
      const res = await fetch(apiUrl(path), { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to dismiss trouble word");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trouble-words"] });
    },
  });
}

export async function fetchTroubleSrsQueue(
  deck: SrsDeckType,
  wordIds: number[],
): Promise<import("../types/srs").SrsQueueItem[]> {
  if (wordIds.length === 0) return [];
  const params = new URLSearchParams({
    deck,
    wordIds: wordIds.join(","),
    ignoreDue: "1",
    sort: "due-asc",
  });
  const res = await fetch(apiUrl(`/api/srs/queue?${params}`));
  if (!res.ok) throw new Error("Failed to load trouble review queue");
  return res.json();
}
