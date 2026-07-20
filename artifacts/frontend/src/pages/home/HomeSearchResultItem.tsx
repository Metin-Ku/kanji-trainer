import { useState, useEffect } from "react";
import { BookOpen, Languages, Waves, Pencil, Trash2 } from "lucide-react";
import {
  RelatedWordsList,
  RelatedWordsButton,
} from "../../components/RelatedWordsList";
import {
  CategoryChip,
  CategoryWordsList,
} from "../../components/CategoryWordsList";
import { useCategories } from "../../hooks/useCategories";
import type { Word } from "../../types";
import { themeVars } from "../../theme";

interface Props {
  word: Word;
  allWords: Word[];
  isOpen: boolean;
  isRelatedOpen: boolean;
  onToggle: () => void;
  onToggleRelated: () => void;
  onEdit: (word: Word) => void;
  onDelete: (id: number) => void;
}

export function HomeSearchResultItem({
  word,
  allWords,
  isOpen,
  isRelatedOpen,
  onToggle,
  onToggleRelated,
  onEdit,
  onDelete,
}: Props) {
  const { data: categories = [] } = useCategories();
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) setActiveCategoryId(null);
  }, [isOpen]);

  const hasDetail = !!(
    word.pronunciation ||
    word.meaning ||
    word.description ||
    (word.categoryIds?.length ?? 0) > 0
  );

  const wordCategories = (word.categoryIds ?? [])
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c);

  const activeCategory =
    activeCategoryId != null
      ? categories.find((c) => c.id === activeCategoryId)
      : undefined;

  const categoryWords = activeCategory
    ? allWords.filter(
        (w) =>
          w.id !== word.id && (w.categoryIds ?? []).includes(activeCategory.id),
      )
    : [];

  return (
    <div className="border-app-border border-b last:border-b-0">
      <div
        className={`flex items-start gap-3 px-5 pt-3 ${isOpen ? "pb-0" : "pb-3"} cursor-pointer select-none`}
        onClick={() => hasDetail && onToggle()}
      >
        <div className="min-w-0 flex-1">
          <p className="text-app-text text-base leading-none font-bold">
            {word.kanji}
          </p>

          {word.pronunciation && (
            <p className="text-app-text-secondary mt-0.5 text-xs">
              {word.pronunciation}
            </p>
          )}

          {word.meaning && (
            <p
              className={`text-app-text-muted mt-0.5 text-xs ${isOpen ? "" : "truncate"}`}
            >
              {word.meaning}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-row items-center gap-1.5">
          <div className="flex flex-row items-center gap-1.5">
            {word.jlptLevel && (
              <span className="bg-app-muted text-app-text-secondary inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold">
                {word.jlptLevel}
              </span>
            )}

            <div className="flex gap-1">
              {(
                [
                  {
                    Icon: Languages,
                    starred: word.starred,
                    level: word.level,
                  },
                  {
                    Icon: Waves,
                    starred: word.pronStarred,
                    level: word.pronLevel,
                  },
                  {
                    Icon: BookOpen,
                    starred: word.meaningStarred,
                    level: word.meaningLevel,
                  },
                ] as const
              ).map(({ Icon, starred, level }, i) => (
                <div
                  key={i}
                  className="bg-app-muted flex items-center gap-1.5 rounded-full px-2 py-1"
                >
                  <Icon
                    size={13}
                    strokeWidth={2}
                    className="text-app-text-secondary"
                  />

                  {starred ? (
                    <div
                      className="flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{
                        background: themeVars.star,
                        color: "rgb(255,255,255)",
                      }}
                    >
                      ★
                    </div>
                  ) : (
                    <div
                      className="flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: themeVars.level(level) }}
                    >
                      {level}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(word);
              }}
              className="bg-app-muted rounded-lg p-1.5 transition-opacity active:opacity-60"
            >
              <Pencil
                size={13}
                strokeWidth={2}
                className="text-app-text-secondary"
              />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(word.id);
              }}
              className="bg-app-muted rounded-lg p-1.5 transition-opacity active:opacity-60"
            >
              <Trash2 size={13} strokeWidth={2} className="text-red-500" />
            </button>
          </div>
        </div>
      </div>

      {(word.description || word.meaning || activeCategory) && (
        <div className={`word-detail ${isOpen ? "open" : ""}`}>
          {wordCategories.length > 0 && isOpen && (
            <div
              className="mt-1.5 flex flex-wrap gap-1.5 px-5"
              onClick={(e) => e.stopPropagation()}
            >
              {wordCategories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  label={cat.name}
                  iconSvg={cat.iconSvg}
                  active={activeCategoryId === cat.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isOpen) onToggle();
                    setActiveCategoryId((prev) =>
                      prev === cat.id ? null : cat.id,
                    );
                  }}
                />
              ))}
            </div>
          )}
          <div className="space-y-2 px-5 pb-4">
            <div className="flex items-center justify-between gap-2">
              <span />
              {word.meaning && !activeCategory && (
                <RelatedWordsButton
                  active={isRelatedOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleRelated();
                  }}
                />
              )}
            </div>

            {activeCategory ? (
              <CategoryWordsList
                category={activeCategory}
                words={categoryWords}
              />
            ) : isRelatedOpen && word.meaning ? (
              <RelatedWordsList word={word} allWords={allWords} />
            ) : (
              word.description && (
                <div className="text-app-text font-[inherit] text-[14px] leading-relaxed whitespace-pre-wrap">
                  {word.description}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
