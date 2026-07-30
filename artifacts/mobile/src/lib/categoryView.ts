import AsyncStorage from "@react-native-async-storage/async-storage";

export type CategoryViewLayout = "row" | "grid-2" | "grid-3";

const STORAGE_KEY = "kanji-trainer-category-view";

export async function getCategoryViewLayout(): Promise<CategoryViewLayout> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === "row" || raw === "grid-2" || raw === "grid-3") return raw;
  } catch {
    /* ignore */
  }
  return "row";
}

export async function setCategoryViewLayout(layout: CategoryViewLayout): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, layout);
}
