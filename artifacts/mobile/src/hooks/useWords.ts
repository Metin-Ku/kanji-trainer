import { useQueryClient } from "@tanstack/react-query";
import {
  useListWords,
  useCreateWord,
  useUpdateWord,
  useDeleteWord,
  getListWordsQueryKey,
} from "@workspace/api-client-react";
import type { WordInput, WordUpdate } from "@workspace/api-client-react";
import type { Word, SrsExample } from "@/lib/types";
import { apiFetch } from "@/lib/apiFetch";

function defaultDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export type AddWordData = {
  kanji: string;
  pronunciation?: string;
  meaning?: string;
  description?: string;
  srsExamples?: SrsExample[];
  level?: number;
  starred?: boolean;
  pronLevel?: number;
  pronStarred?: boolean;
  meaningLevel?: number;
  meaningStarred?: boolean;
  jlptLevel?: string | null;
  date?: string;
  relatedWordIds?: number[];
  categoryIds?: number[];
};

export function useWords() {
  const queryClient = useQueryClient();
  const { data: rawWords = [], isLoading, isError, refetch } = useListWords();

  const words: Word[] = rawWords.map((w) => ({
    ...w,
    srsExamples: w.srsExamples ?? [],
    categoryIds: (w as Word).categoryIds ?? [],
  })) as Word[];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListWordsQueryKey() });
  };

  const createMutation = useCreateWord({ mutation: { onSuccess: invalidate } });
  const updateMutation = useUpdateWord({ mutation: { onSuccess: invalidate } });
  const deleteMutation = useDeleteWord({ mutation: { onSuccess: invalidate } });

  const addWord = async (data: AddWordData) => {
    const input: WordInput = {
      kanji: data.kanji,
      pronunciation: data.pronunciation ?? "",
      meaning: data.meaning ?? "",
      description: data.description ?? "",
      level: data.level ?? 1,
      jlptLevel: data.jlptLevel ?? undefined,
      date: data.date ?? defaultDateStr(),
      relatedWordIds: data.relatedWordIds ?? [],
      srsExamples: data.srsExamples ?? [],
    };
    const created = await createMutation.mutateAsync({ data: input });
    const patch: WordUpdate = {};
    if (data.starred != null) patch.starred = data.starred;
    if (data.pronLevel != null) patch.pronLevel = data.pronLevel;
    if (data.pronStarred != null) patch.pronStarred = data.pronStarred;
    if (data.meaningLevel != null) patch.meaningLevel = data.meaningLevel;
    if (data.meaningStarred != null) patch.meaningStarred = data.meaningStarred;
    if (Object.keys(patch).length > 0) {
      updateMutation.mutate({ id: created.id, data: patch });
    }
  };

  const updateWord = (id: number, patch: Partial<Word>) =>
    updateMutation.mutate({
      id,
      data: {
        ...patch,
        jlptLevel: patch.jlptLevel ?? undefined,
      } as WordUpdate,
    });

  const updateWordAsync = async (id: number, patch: Partial<Word>) => {
    await updateMutation.mutateAsync({
      id,
      data: {
        ...patch,
        jlptLevel: patch.jlptLevel ?? undefined,
      } as WordUpdate,
    });
  };

  const deleteWord = (id: number) => deleteMutation.mutate({ id });

  const deleteWords = async (ids: number[]) => {
    await Promise.allSettled(
      ids.map((id) => apiFetch(`/api/words/${id}`, { method: "DELETE" })),
    );
    invalidate();
  };

  const bulkCreate = (items: {
    kanji: string;
    pronunciation?: string;
    meaning?: string;
    description?: string;
    srsExamples?: SrsExample[];
    jlptLevel?: string;
    categoryNames?: string[];
    synonymKanji?: string[];
  }[]) =>
    apiFetch("/api/words/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words: items }),
    }).then(async (res) => {
      if (!res.ok) throw new Error("Bulk import failed");
      const result = await res.json();
      invalidate();
      return result as {
        total: number;
        added: number;
        updated: number;
        updatedWords: string[];
      };
    });

  return {
    words,
    isLoading,
    isError,
    refetch,
    addWord,
    updateWord,
    updateWordAsync,
    deleteWord,
    deleteWords,
    bulkCreate,
  };
}
