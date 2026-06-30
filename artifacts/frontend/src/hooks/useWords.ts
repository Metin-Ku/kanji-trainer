import { useQueryClient } from "@tanstack/react-query";
import {
  useListWords,
  useCreateWord,
  useUpdateWord,
  useDeleteWord,
  useBulkCreateWords,
  getListWordsQueryKey,
} from "@workspace/api-client-react";
import type { WordInput, WordUpdate, Word } from "../types";

export function useWords() {
  const queryClient = useQueryClient();

  const { data: rawWords = [], isLoading, isError } = useListWords();
  const words: Word[] = rawWords.map((w) => ({
    ...w,
    srsExamples: w.srsExamples ?? [],
  }));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListWordsQueryKey() });

  const createMutation = useCreateWord({ mutation: { onSuccess: invalidate } });
  const updateMutation = useUpdateWord({ mutation: { onSuccess: invalidate } });
  const deleteMutation = useDeleteWord({ mutation: { onSuccess: invalidate } });
  const bulkMutation = useBulkCreateWords({ mutation: { onSuccess: invalidate } });

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
  }[]) => bulkMutation.mutateAsync({ data: { words } });

  const deleteWords = async (ids: number[]) => {
    await Promise.allSettled(
      ids.map((id) => fetch(`/api/words/${id}`, { method: "DELETE" }))
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
    isBulkLoading: bulkMutation.isPending,
  };
}
