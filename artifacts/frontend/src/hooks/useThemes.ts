import { useQueryClient } from "@tanstack/react-query";
import {
  useListThemes,
  useGetTheme,
  useCreateTheme,
  useUpdateTheme,
  useDeleteTheme,
  useReplaceThemeWords,
  useAddThemeWords,
  useRemoveThemeWord,
  useReplaceThemeQuestions,
  getListThemesQueryKey,
  getGetThemeQueryKey,
} from "@workspace/api-client-react";
import type { ThemeInput, ThemeUpdate, ThemeQuestionsInput } from "../types";

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
  const createMutation = useCreateTheme({
    mutation: { onSuccess: () => invalidateList() },
  });
  const updateMutation = useUpdateTheme({
    mutation: { onSuccess: (_d, vars) => invalidateAll(vars.id) },
  });
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
    themes: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    createTheme: (data: ThemeInput) => createMutation.mutateAsync({ data }),
    updateTheme: (id: number, data: ThemeUpdate) =>
      updateMutation.mutateAsync({ id, data }),
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
      createMutation.isPending ||
      updateMutation.isPending ||
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

  const updateMutation = useUpdateTheme({
    mutation: { onSuccess: invalidate },
  });
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
    theme: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    updateTheme: (data: ThemeUpdate) =>
      updateMutation.mutateAsync({ id, data }),
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
      updateMutation.isPending ||
      replaceWordsMutation.isPending ||
      addWordsMutation.isPending ||
      replaceQuestionsMutation.isPending,
  };
}
