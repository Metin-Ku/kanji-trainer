export type CategoryViewLayout = "row" | "grid-2" | "grid-3";

const STORAGE_KEY = "kanji-trainer-category-view";

export function getCategoryViewLayout(): CategoryViewLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "row" || raw === "grid-2" || raw === "grid-3") return raw;
  } catch {
    /* ignore */
  }
  return "row";
}

export function setCategoryViewLayout(layout: CategoryViewLayout): void {
  localStorage.setItem(STORAGE_KEY, layout);
}
