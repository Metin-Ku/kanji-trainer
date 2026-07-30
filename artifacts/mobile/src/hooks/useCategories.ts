import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";

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

  return {
    ...query,
    createCategory: async (input: CategoryInput): Promise<CategorySummary> => {
      const res = await apiFetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name.trim(),
          iconSvg: normalizeIconSvg(input.iconSvg),
        }),
      });
      if (!res.ok) throw new Error("Failed to create category");
      const cat = await res.json();
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      return cat;
    },
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

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    updateCategory: async (input: CategoryInput): Promise<CategoryDetail> => {
      const res = await apiFetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name.trim(),
          iconSvg: normalizeIconSvg(input.iconSvg),
        }),
      });
      if (!res.ok) throw new Error("Failed to update category");
      const cat = await res.json();
      invalidate();
      return cat;
    },
    deleteCategory: async (): Promise<void> => {
      const res = await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete category");
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
    setCategoryWords: async (wordIds: number[]): Promise<number[]> => {
      const res = await apiFetch(`/api/categories/${id}/words`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordIds }),
      });
      if (!res.ok) throw new Error("Failed to update category words");
      const data = (await res.json()) as { wordIds: number[] };
      invalidate();
      return data.wordIds;
    },
  };
}
