import { LoadingPlaceholder } from "../../components/LoadingPlaceholder";
import { useTranslation } from "../../i18n/I18nProvider";
import type { Word } from "../../types";
import { HomeSearchResultItem } from "./HomeSearchResultItem";

interface Props {
  query: string;
  results: Word[];
  allWords: Word[];
  isLoading: boolean;
  openIds: Set<number>;
  relatedOpenIds: Set<number>;
  onToggleOpen: (id: number) => void;
  onToggleRelated: (id: number) => void;
  onEdit: (word: Word) => void;
  onDelete: (id: number) => void;
}

export function HomeSearchResults({
  query,
  results,
  allWords,
  isLoading,
  openIds,
  relatedOpenIds,
  onToggleOpen,
  onToggleRelated,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="bg-app-surface flex-1 overflow-y-auto">
        <LoadingPlaceholder />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-app-surface flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
          <p className="text-app-border-strong mb-3 text-4xl">?</p>
          <p className="text-app-text-muted text-sm">
            {t("common.noResultsForQuery", { query })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-app-surface flex-1 overflow-y-auto">
      <p className="text-app-text-muted px-5 pt-3 pb-1 text-xs font-medium">
        {t("common.resultCount", { count: results.length })}
      </p>
      {results.map((word) => (
        <HomeSearchResultItem
          key={word.id}
          word={word}
          allWords={allWords}
          isOpen={openIds.has(word.id)}
          isRelatedOpen={relatedOpenIds.has(word.id)}
          onToggle={() => onToggleOpen(word.id)}
          onToggleRelated={() => onToggleRelated(word.id)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
