import { useQueryClient } from "@tanstack/react-query";
import {
  useListWords,
  useCreateWord,
  useUpdateWord,
  useDeleteWord,
  getListWordsQueryKey,
} from "@workspace/api-client-react";
import { apiFetch } from "../lib/apiOrigin";
import type { WordInput, WordUpdate, Word } from "../types";
import { CATEGORIES_QUERY_KEY } from "./useCategories";

export function useWords() {
  const queryClient = useQueryClient();

  const { data: rawWords = [], isLoading, isError } = useListWords();
  const words: Word[] = rawWords.map((w) => ({
    ...w,
    srsExamples: w.srsExamples ?? [],
    categoryIds: (w as Word).categoryIds ?? [],
  }));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListWordsQueryKey() });
    queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
  };

  const createMutation = useCreateWord({ mutation: { onSuccess: invalidate } });
  const updateMutation = useUpdateWord({ mutation: { onSuccess: invalidate } });
  const deleteMutation = useDeleteWord({ mutation: { onSuccess: invalidate } });

  const updateWordAsync = (id: number, patch: WordUpdate) =>
    updateMutation.mutateAsync({ id, data: {
      ...patch,
      jlptLevel: patch.jlptLevel ?? undefined,
      srsExamples: patch.srsExamples,
    } });

  const addWord = (data: WordInput) =>
    createMutation.mutate({
      data: {
        ...data,
        jlptLevel: data.jlptLevel ?? undefined,
        srsExamples: data.srsExamples,
      },
    });
  const updateWord = (id: number, patch: WordUpdate) =>
    updateMutation.mutate({
      id,
      data: {
        ...patch,
        jlptLevel: patch.jlptLevel ?? undefined,
        srsExamples: patch.srsExamples,
      },
    });
  const deleteWord = (id: number) => deleteMutation.mutate({ id });
  const bulkCreate = (words: {
    kanji: string;
    pronunciation?: string;
    meaning?: string;
    description?: string;
    srsExamples?: import("../types").SrsExample[];
    jlptLevel?: string;
    categoryNames?: string[];
    synonymKanji?: string[];
  }[]) =>
    apiFetch("/api/words/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words }),
    }).then(async (res) => {
      if (!res.ok) throw new Error("Bulk import failed");
      const data = await res.json();
      invalidate();
      return data as {
        total: number;
        added: number;
        updated: number;
        updatedWords: string[];
      };
    });

  const deleteWords = async (ids: number[]) => {
    await Promise.allSettled(
      ids.map((id) => apiFetch(`/api/words/${id}`, { method: "DELETE" }))
    );
    invalidate();
  };

  return {
    words,
    isLoading,
    isError,
    addWord,
    updateWord,
    updateWordAsync,
    deleteWord,
    deleteWords,
    bulkCreate,
  };
}
