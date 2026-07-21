import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiOrigin";
import type {
  ReviewRating,
  SrsDeckStats,
  SrsDeckType,
  SrsQueueItem,
  SrsSortMode,
} from "../types/srs";

export function useSrsDecks() {
  return useQuery({
    queryKey: ["srs", "decks"],
    queryFn: async (): Promise<SrsDeckStats[]> => {
      const res = await apiFetch("/api/srs/decks");
      if (!res.ok) throw new Error("Failed to load SRS decks");
      return res.json();
    },
  });
}

export function useSrsSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/srs/sync", { method: "POST" });
      if (!res.ok) throw new Error("Failed to sync SRS");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["srs"] });
      queryClient.invalidateQueries({ queryKey: ["trouble-words"] });
    },
  });
}

export async function fetchSrsQueue(
  deck: SrsDeckType,
  options: {
    jlptMin?: string | null;
    jlptMax?: string | null;
    sort?: SrsSortMode;
    wordIds?: number[];
    ignoreDue?: boolean;
  },
): Promise<SrsQueueItem[]> {
  const params = new URLSearchParams({ deck });
  if (options.jlptMin) params.set("jlptMin", options.jlptMin);
  if (options.jlptMax) params.set("jlptMax", options.jlptMax);
  if (options.sort) params.set("sort", options.sort);
  if (options.wordIds?.length) params.set("wordIds", options.wordIds.join(","));
  if (options.ignoreDue) params.set("ignoreDue", "1");

  const res = await apiFetch(`/api/srs/queue?${params}`);
  if (!res.ok) throw new Error("Failed to load review queue");
  return res.json();
}

export async function reviewSrsCard(
  cardId: number,
  rating: ReviewRating,
  date?: string,
) {
  const res = await apiFetch(`/api/srs/cards/${cardId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, date }),
  });
  if (!res.ok) throw new Error("Failed to review card");
  return res.json();
}

export async function reviewSrsExample(
  cardId: number,
  correct: boolean,
  date?: string,
) {
  const res = await apiFetch(`/api/srs/cards/${cardId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correct, date }),
  });
  if (!res.ok) throw new Error("Failed to review card");
  return res.json();
}
