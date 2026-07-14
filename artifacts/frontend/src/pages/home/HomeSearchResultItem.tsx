import { useState, useEffect } from "react";
import {
  BookOpen,
  Languages,
  Waves,
  Pencil,
  Trash2,
} from "lucide-react";
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

  const categoryWords =
    activeCategory
      ? allWords.filter(
          (w) =>
            w.id !== word.id &&
            (w.categoryIds ?? []).includes(activeCategory.id),
        )
      : [];

  return (
    <div className="border-b border-app-border last:border-b-0">
      <div
        className={`flex items-start gap-3 px-5 pt-3 ${isOpen ? "pb-0" : "pb-3"} select-none cursor-pointer`}
        onClick={() => hasDetail && onToggle()}
      >
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-app-text leading-none">
            {word.kanji}
          </p>

          {word.pronunciation && (
            <p className="text-xs text-app-text-secondary mt-0.5">
              {word.pronunciation}
            </p>
          )}

          {word.meaning && (
            <p
              className={`text-xs text-app-text-muted mt-0.5 ${isOpen ? "" : "truncate"}`}
            >
              {word.meaning}
            </p>
          )}

        </div>

        <div className="flex flex-row items-center gap-1.5 shrink-0">
          <div className="flex flex-row items-center gap-1.5">
            {word.jlptLevel && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-app-muted text-app-text-secondary">
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
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-app-muted"
                >
                  <Icon
                    size={13}
                    strokeWidth={2}
                    className="text-app-text-secondary"
                  />

                  {starred ? (
                    <div
                      className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: themeVars.star,
                        color: "rgb(255,255,255)",
                      }}
                    >
                      ★
                    </div>
                  ) : (
                    <div
                      className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
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
              className="p-1.5 rounded-lg bg-app-muted active:opacity-60 transition-opacity"
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
              className="p-1.5 rounded-lg bg-app-muted active:opacity-60 transition-opacity"
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
              className="flex flex-wrap gap-1.5 mt-1.5 px-5"
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
          <div className="px-5 pb-4 space-y-2">
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
                <div className="whitespace-pre-wrap text-[14px] text-app-text leading-relaxed font-[inherit]">
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