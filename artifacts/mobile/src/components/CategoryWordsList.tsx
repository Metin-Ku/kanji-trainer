import type { CategorySummary } from "@/hooks/useCategories";
import type { Word } from "@/lib/types";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { CategoryTitle } from "./CategoryIcon";
import { CompactWordList } from "./CompactWordList";

type Props = {
  category: CategorySummary;
  words: Word[];
};

export function CategoryWordsList({ category, words }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <CompactWordList
      words={words}
      emptyMessage={t("categories.noWordsInCategory")}
      header={
        <CategoryTitle
          name={category.name}
          iconSvg={category.iconSvg}
          iconSize={14}
          color={theme.main500}
        />
      }
    />
  );
}
