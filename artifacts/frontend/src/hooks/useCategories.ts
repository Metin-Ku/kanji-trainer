import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiOrigin";

export interface CategorySummary {
  id: number;
  name: string;
  iconSvg: string | null;
  sortOrder: number;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDetail {
  id: number;
  name: string;
  iconSvg: string | null;
  sortOrder: number;
  wordIds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryInput {
  name: string;
  iconSvg?: string | null;
}

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

function normalizeIconSvg(iconSvg?: string | null): string | null {
  if (iconSvg == null) return null;
  const trimmed = iconSvg.trim();
  return trimmed || null;
}

export function useCategories() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: async (): Promise<CategorySummary[]> => {
      const res = await apiFetch("/api/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CategoryInput): Promise<CategorySummary> => {
      const res = await apiFetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name.trim(),
          iconSvg: normalizeIconSvg(input.iconSvg),
        }),
      });
      if (!res.ok) throw new Error("Failed to create category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
  });

  return {
    ...query,
    createCategory: (input: CategoryInput) => createMutation.mutateAsync(input),
    isCreating: createMutation.isPending,
  };
}

export function useCategory(id: number) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, id],
    queryFn: async (): Promise<CategoryDetail> => {
      const res = await apiFetch(`/api/categories/${id}`);
      if (!res.ok) throw new Error("Failed to load category");
      return res.json();
    },
    enabled: Number.isFinite(id) && id > 0,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: [...CATEGORIES_QUERY_KEY, id] });
  };

  const updateMutation = useMutation({
    mutationFn: async (input: CategoryInput): Promise<CategoryDetail> => {
      const res = await apiFetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name.trim(),
          iconSvg: normalizeIconSvg(input.iconSvg),
        }),
      });
      if (!res.ok) throw new Error("Failed to update category");
      return res.json();
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const res = await apiFetch(`/api/categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete category");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
  });

  const setWordsMutation = useMutation({
    mutationFn: async (wordIds: number[]): Promise<number[]> => {
      const res = await apiFetch(`/api/categories/${id}/words`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordIds }),
      });
      if (!res.ok) throw new Error("Failed to update category words");
      const data = (await res.json()) as { wordIds: number[] };
      return data.wordIds;
    },
    onSuccess: (wordIds) => {
      queryClient.setQueryData(
        [...CATEGORIES_QUERY_KEY, id],
        (prev: CategoryDetail | undefined) =>
          prev ? { ...prev, wordIds } : prev,
      );
      invalidate();
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    updateCategory: (input: CategoryInput) => updateMutation.mutateAsync(input),
    deleteCategory: () => deleteMutation.mutateAsync(),
    setCategoryWords: (wordIds: number[]) =>
      setWordsMutation.mutateAsync(wordIds),
    isSaving:
      updateMutation.isPending ||
      deleteMutation.isPending ||
      setWordsMutation.isPending,
  };
}
