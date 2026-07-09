import { useQueryClient } from "@tanstack/react-query";
import {
  useListThemes,
  useGetTheme,
  useDeleteTheme,
  useReplaceThemeWords,
  useAddThemeWords,
  useRemoveThemeWord,
  useReplaceThemeQuestions,
  getListThemesQueryKey,
  getGetThemeQueryKey,
} from "@workspace/api-client-react";
import type { ThemeInput, ThemeUpdate, ThemeQuestionsInput, ThemeSummary, ThemeDetail } from "../types";
import { apiUrl } from "../lib/apiOrigin";

function normalizeIconSvg(iconSvg?: string | null): string | null {
  if (iconSvg == null) return null;
  const trimmed = iconSvg.trim();
  return trimmed || null;
}

export function useThemes() {
  const queryClient = useQueryClient();

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getListThemesQueryKey() });

  const invalidateTheme = (id: number) =>
    queryClient.invalidateQueries({ queryKey: getGetThemeQueryKey(id) });

  const invalidateAll = (id?: number) => {
    invalidateList();
    if (id != null) invalidateTheme(id);
  };

  const listQuery = useListThemes();
  const deleteMutation = useDeleteTheme({
    mutation: { onSuccess: () => invalidateList() },
  });
  const replaceWordsMutation = useReplaceThemeWords({
    mutation: { onSuccess: (_d, vars) => invalidateAll(vars.id) },
  });
  const addWordsMutation = useAddThemeWords({
    mutation: { onSuccess: (_d, vars) => invalidateAll(vars.id) },
  });
  const removeWordMutation = useRemoveThemeWord({
    mutation: { onSuccess: (_d, vars) => invalidateAll(vars.id) },
  });
  const replaceQuestionsMutation = useReplaceThemeQuestions({
    mutation: { onSuccess: (_d, vars) => invalidateAll(vars.id) },
  });

  return {
    themes: (listQuery.data ?? []) as ThemeSummary[],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    createTheme: async (data: ThemeInput) => {
      const res = await fetch(apiUrl("/api/themes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          wordIds: data.wordIds,
          iconSvg: normalizeIconSvg(data.iconSvg),
        }),
      });
      if (!res.ok) throw new Error("Failed to create theme");
      const theme = await res.json();
      invalidateList();
      return theme;
    },
    updateTheme: async (id: number, data: ThemeUpdate) => {
      const res = await fetch(apiUrl(`/api/themes/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.iconSvg !== undefined
            ? { iconSvg: normalizeIconSvg(data.iconSvg) }
            : {}),
        }),
      });
      if (!res.ok) throw new Error("Failed to update theme");
      const theme = await res.json();
      invalidateAll(id);
      return theme;
    },
    deleteTheme: (id: number) => deleteMutation.mutateAsync({ id }),
    replaceThemeWords: (id: number, wordIds: number[]) =>
      replaceWordsMutation.mutateAsync({ id, data: { wordIds } }),
    addThemeWords: (id: number, wordIds: number[]) =>
      addWordsMutation.mutateAsync({ id, data: { wordIds } }),
    removeThemeWord: (id: number, wordId: number) =>
      removeWordMutation.mutateAsync({ id, wordId }),
    saveThemeQuestions: (id: number, data: ThemeQuestionsInput) =>
      replaceQuestionsMutation.mutateAsync({ id, data }),
    isSaving:
      deleteMutation.isPending ||
      replaceWordsMutation.isPending ||
      addWordsMutation.isPending ||
      replaceQuestionsMutation.isPending,
  };
}

export function useTheme(id: number) {
  const queryClient = useQueryClient();
  const query = useGetTheme(id, {
    query: {
      queryKey: getGetThemeQueryKey(id),
      enabled: Number.isFinite(id) && id > 0,
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetThemeQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListThemesQueryKey() });
  };

  const replaceWordsMutation = useReplaceThemeWords({
    mutation: { onSuccess: invalidate },
  });
  const addWordsMutation = useAddThemeWords({
    mutation: { onSuccess: invalidate },
  });
  const removeWordMutation = useRemoveThemeWord({
    mutation: { onSuccess: invalidate },
  });
  const replaceQuestionsMutation = useReplaceThemeQuestions({
    mutation: { onSuccess: invalidate },
  });
  const deleteMutation = useDeleteTheme({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListThemesQueryKey() });
      },
    },
  });

  return {
    theme: query.data as ThemeDetail | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    updateTheme: async (data: ThemeUpdate) => {
      const res = await fetch(apiUrl(`/api/themes/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.iconSvg !== undefined
            ? { iconSvg: normalizeIconSvg(data.iconSvg) }
            : {}),
        }),
      });
      if (!res.ok) throw new Error("Failed to update theme");
      const theme = await res.json();
      invalidate();
      return theme;
    },
    deleteTheme: () => deleteMutation.mutateAsync({ id }),
    replaceThemeWords: (wordIds: number[]) =>
      replaceWordsMutation.mutateAsync({ id, data: { wordIds } }),
    addThemeWords: (wordIds: number[]) =>
      addWordsMutation.mutateAsync({ id, data: { wordIds } }),
    removeThemeWord: (wordId: number) =>
      removeWordMutation.mutateAsync({ id, wordId }),
    saveThemeQuestions: (data: ThemeQuestionsInput) =>
      replaceQuestionsMutation.mutateAsync({ id, data }),
    isSaving:
      replaceWordsMutation.isPending ||
      addWordsMutation.isPending ||
      replaceQuestionsMutation.isPending,
  };
}
