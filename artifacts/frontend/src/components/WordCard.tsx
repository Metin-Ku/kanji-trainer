import { useState, useEffect } from "react";
import { Word, WordUpdate } from "../types";
import { LevelChart } from "./LevelChart";
import { KanjiStrokeModal } from "./KanjiStrokeModal";
import { RelatedWordsList, RelatedWordsButton } from "./RelatedWordsList";
import { CategoryChip, CategoryWordsList } from "./CategoryWordsList";
import { useCategories } from "../hooks/useCategories";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "../i18n/I18nProvider";
import { hasKanji } from "../lib/japaneseScript";

interface Props {
  word: Word;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (id: number, patch: WordUpdate) => void;
  onDelete: (id: number) => void;
  onEdit: (word: Word) => void;
  cardRef?: (el: HTMLDivElement | null) => void;
  selectMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  pinned?: boolean;
  allWords?: Word[];
}

export function WordCard({
  word,
  index,
  isOpen,
  onToggle,
  onUpdate,
  onDelete,
  onEdit,
  cardRef,
  selectMode = false,
  isSelected = false,
  onSelect,
  pinned = false,
  allWords,
}: Props) {
  const { t, formatCardDate } = useTranslation();
  const { data: categories = [] } = useCategories();
  const [showStroke, setShowStroke] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  useEffect(() => {
    if (!isOpen) {
      setShowRelated(false);
      setActiveCategoryId(null);
    }
  }, [isOpen]);

  const wordCategories = (word.categoryIds ?? [])
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c);

  const activeCategory =
    activeCategoryId != null
      ? categories.find((c) => c.id === activeCategoryId)
      : undefined;

  const categoryWords =
    activeCategory && allWords
      ? allWords.filter(
          (w) =>
            w.id !== word.id &&
            (w.categoryIds ?? []).includes(activeCategory.id),
        )
      : [];
  const kanjiClickable = hasKanji(word.kanji) && !selectMode;

  function handleRowClick() {
    if (selectMode) {
      onSelect?.();
      return;
    }
    onToggle();
  }

  return (
    <>
      <div ref={cardRef} className="border-app-border border-b last:border-b-0">
        <div
          className={`flex cursor-pointer items-center gap-2.5 px-4 py-3 select-none ${pinned ? "bg-main-50/50 dark:bg-main-950/50" : ""}`}
          onClick={handleRowClick}
        >
          {selectMode ? (
            <div
              className={`border-app-border-strong flex h-4.5 w-4.5 mt-[2px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? "border-main-500 bg-main-500" : "transparent"}`}
            >
              {isSelected && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path
                    d="M1 4L4 7L9 1"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ) : (
            <span className="text-app-text-muted mb-[1px] w-5 shrink-0 self-end text-right text-sm font-medium tabular-nums">
              {index}
            </span>
          )}

          <LevelChart
            level={word.level}
            starred={word.starred}
            onChangeLevel={(l) => {
              if (!selectMode) onUpdate(word.id, { level: l });
            }}
            onToggleStar={() => {
              if (!selectMode) onUpdate(word.id, { starred: !word.starred });
            }}
          />

          <span
            className={[
              "shrink-0 text-lg leading-none font-bold",
              kanjiClickable
                ? "text-app-text active:text-main-500 dark:active:text-main-600 transition-colors"
                : "text-app-text",
            ].join(" ")}
            style={kanjiClickable ? { cursor: "zoom-in" } : {}}
            onClick={
              kanjiClickable
                ? (e) => {
                    e.stopPropagation();
                    setShowStroke(true);
                  }
                : undefined
            }
          >
            {word.kanji}
          </span>

          {word.jlptLevel && !selectMode && (
            <span className="bg-app-muted text-app-text-secondary shrink-0 rounded-md px-1.5 py-[3px] text-[10px] leading-none font-semibold">
              {word.jlptLevel}
            </span>
          )}

          <span className="flex-1" />

          {!selectMode && (
            <div
              className="flex shrink-0 gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="text-app-text-muted rounded-lg p-1.5 transition-colors hover:text-blue-400"
                onClick={() => onEdit(word)}
                aria-label={t("a11y.edit")}
              >
                <Pencil size={14} />
              </button>
              <button
                className="text-app-text-muted rounded-lg p-1.5 transition-colors hover:text-red-400"
                onClick={() => onDelete(word.id)}
                aria-label={t("common.delete")}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
          {selectMode && (
            <div
              className="invisible flex shrink-0 gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="text-app-text-muted rounded-lg p-1.5 transition-colors hover:text-blue-400"
                disabled
              >
                <Pencil size={14} />
              </button>
              <button
                className="text-app-text-muted rounded-lg p-1.5 transition-colors hover:text-red-400"
                disabled
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {!selectMode && (
          <div className={`word-detail ${isOpen ? "open" : ""}`}>
            <div className="space-y-2 px-5 pb-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-app-text-muted text-xs font-medium">
                  {showRelated ? "" : formatCardDate(word.date)}
                </p>
                {word.meaning && allWords && (
                  <RelatedWordsButton
                    active={showRelated}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCategoryId(null);
                      setShowRelated((v) => !v);
                    }}
                  />
                )}
              </div>
              {showRelated && word.meaning && allWords ? (
                <RelatedWordsList word={word} allWords={allWords} />
              ) : (
                <>
                  {word.pronunciation && (
                    <p className="text-app-text-secondary text-sm">
                      <span className="text-app-text-muted mr-2 text-xs font-medium tracking-wide uppercase">
                        {t("common.pronunciation")}
                      </span>
                      {word.pronunciation}
                    </p>
                  )}
                  {word.meaning && (
                    <p className="text-app-text-secondary text-sm">
                      <span className="text-app-text-muted mr-2 text-xs font-medium tracking-wide uppercase">
                        {t("common.meaning")}
                      </span>
                      {word.meaning}
                    </p>
                  )}
                  {wordCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {wordCategories.map((cat) => (
                        <CategoryChip
                          key={cat.id}
                          label={cat.name}
                          iconSvg={cat.iconSvg}
                          active={activeCategoryId === cat.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRelated(false);
                            setActiveCategoryId((prev) =>
                              prev === cat.id ? null : cat.id,
                            );
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {activeCategory ? (
                    <CategoryWordsList
                      category={activeCategory}
                      words={categoryWords}
                    />
                  ) : (
                    word.description && (
                      <div className="border-app-border border-t pt-1">
                        <div className="text-app-text font-[inherit] text-[15px] leading-relaxed whitespace-pre-wrap">
                          {word.description}
                        </div>
                      </div>
                    )
                  )}
                  {!word.pronunciation &&
                    !word.meaning &&
                    !word.description &&
                    wordCategories.length === 0 && (
                      <span className="text-app-text-muted text-sm italic">
                        {t("common.noDescription")}
                      </span>
                    )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showStroke && (
        <KanjiStrokeModal
          kanji={word.kanji}
          onClose={() => setShowStroke(false)}
        />
      )}
    </>
  );
}
