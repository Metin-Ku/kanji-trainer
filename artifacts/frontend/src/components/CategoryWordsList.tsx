import type { Word } from "../types";
import type { CategorySummary } from "../hooks/useCategories";
import { useTranslation } from "../i18n/I18nProvider";
import { CompactWordList } from "./CompactWordList";
import { CategoryIcon, CategoryTitle } from "./CategoryIcon";

interface Props {
  category: CategorySummary;
  words: Word[];
}

export function CategoryWordsList({ category, words }: Props) {
  const { t } = useTranslation();
  return (
    <CompactWordList
      words={words}
      emptyMessage={t("categories.noWordsInCategory")}
      header={
        <CategoryTitle
          name={category.name}
          iconSvg={category.iconSvg}
          iconSize={14}
        />
      }
    />
  );
}

interface ChipProps {
  label: string;
  iconSvg?: string | null;
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export function CategoryChip({ label, iconSvg, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-main-500 dark:bg-main-600 text-white"
          : "bg-app-muted text-app-text-secondary hover:bg-main-50 hover:text-main-600 dark:hover:bg-main-950 dark:hover:text-main-300"
      }`}
    >
      <CategoryIcon svg={iconSvg} size={14} />
      {label}
    </button>
  );
}
