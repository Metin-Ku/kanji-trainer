import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import type { SrsDeckType } from "@/types/srs";

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

export function useTroubleWordCount() {
  return useQuery({
    queryKey: ["trouble-words", "count"],
    queryFn: async (): Promise<number> => {
      const res = await apiFetch("/api/trouble-words?limit=1");
      if (!res.ok) throw new Error("Failed to load trouble word count");
      const data = (await res.json()) as TroubleWordsResponse;
      return data.totalWords;
    },
  });
}

export function useTroubleWords() {
  return useQuery({
    queryKey: ["trouble-words", "all"],
    queryFn: async (): Promise<TroubleWordsResponse> => {
      const res = await apiFetch("/api/trouble-words");
      if (!res.ok) throw new Error("Failed to load trouble words");
      return res.json();
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
      const res = await apiFetch(path, { method: "DELETE" });
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
): Promise<import("@/types/srs").SrsQueueItem[]> {
  const params = new URLSearchParams({
    deck,
    wordIds: wordIds.join(","),
    ignoreDue: "1",
  });
  const res = await apiFetch(`/api/srs/queue?${params}`);
  if (!res.ok) throw new Error("Failed to load trouble queue");
  return res.json();
}
