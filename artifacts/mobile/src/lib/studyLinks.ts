import { Blocks, BookOpen, Languages, Layers, SquareStack, Star, Waves } from "lucide-react-native";
import type { CategorySummary } from "@/hooks/useCategories";
import type { ThemeSummary } from "@/hooks/useThemes";
import { DAILY_GOAL_DECK_IDS } from "@/lib/dailyGoal";
import type { Word } from "@/lib/types";

export const STUDY_LINKS = [
  { path: "/words", Icon: Languages, titleKey: "nav.words" as const },
  {
    path: "/pronunciation",
    Icon: Waves,
    titleKey: "nav.pronunciation" as const,
  },
  { path: "/meaning", Icon: BookOpen, titleKey: "nav.meaning" as const },
  { path: "/learned", Icon: Star, titleKey: "nav.learned" as const },
  { path: "/categories", Icon: SquareStack, titleKey: "nav.categories" as const },
  { path: "/themes", Icon: Blocks, titleKey: "nav.themes" as const },
  { path: "/srs", Icon: Layers, titleKey: "nav.decks" as const },
] as const;

export type StudyLinkTitleKey = (typeof STUDY_LINKS)[number]["titleKey"];

export function buildStudyCounts(
  words: Word[],
  themes: ThemeSummary[],
  categories: CategorySummary[],
): Record<StudyLinkTitleKey, number> {
  const starredCount = words.filter((w) => w.starred).length;
  const nonStarredCount = words.filter((w) => !w.starred).length;

  return {
    "nav.words": nonStarredCount,
    "nav.pronunciation": words.length,
    "nav.meaning": words.length,
    "nav.learned": starredCount,
    "nav.themes": themes.length,
    "nav.categories": categories.length,
    "nav.decks": DAILY_GOAL_DECK_IDS.length,
  };
}

export function studyCountLabel(
  titleKey: StudyLinkTitleKey,
  count: number,
  t: (key: string, params?: Record<string, number>) => string,
): string {
  if (titleKey === "nav.themes") return t("common.themeCount", { count });
  if (titleKey === "nav.categories") return t("common.categoryCount", { count });
  if (titleKey === "nav.decks") return t("common.deckCount", { count });
  return t("common.wordCount", { count });
}
