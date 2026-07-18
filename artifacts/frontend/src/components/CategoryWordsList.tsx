import { useState } from "react";
import { BookOpen, Languages, Waves } from "lucide-react";
import type { Word } from "../types";
import type { CategorySummary } from "../hooks/useCategories";
import { themeVars } from "../theme";
import { useTranslation } from "../i18n/I18nProvider";
import { CategoryIcon, CategoryTitle } from "./CategoryIcon";

interface Props {
  category: CategorySummary;
  words: Word[];
}

export function CategoryWordsList({ category, words }: Props) {
  const { t } = useTranslation();
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setOpenIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  if (words.length === 0) {
    return (
      <div className="border-app-border bg-app-surface rounded-lg border px-4 py-3">
        <p className="text-app-text-muted text-center text-xs">
          {t("categories.noWordsInCategory")}
        </p>
      </div>
    );
  }

  return (
    <div
      className="border-app-border bg-app-surface overflow-y-auto rounded-lg border"
      style={{ maxHeight: 280 }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-app-text-muted px-4 pt-3 pb-1 text-[10px] font-bold tracking-widest uppercase">
        <CategoryTitle
          name={category.name}
          iconSvg={category.iconSvg}
          iconSize={14}
        />
      </p>
      {words.map((w) => {
        const isOpen = openIds.has(w.id);
        return (
          <div
            key={w.id}
            className="border-app-border border-b last:border-b-0"
          >
            <div
              className="flex cursor-pointer items-center gap-3 px-4 py-2.5 select-none"
              onClick={() => toggle(w.id)}
            >
              <div className="min-w-0 flex-1">
                <p className="text-app-text text-sm font-bold">{w.kanji}</p>
                {w.pronunciation && (
                  <p className="text-app-text-secondary mt-0.5 text-xs">
                    {w.pronunciation}
                  </p>
                )}
                {w.meaning && (
                  <p className="text-app-text-muted mt-0.5 truncate text-xs">
                    {w.meaning}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {w.jlptLevel && (
                  <span className="bg-app-muted text-app-text-secondary shrink-0 rounded-md px-1.5 py-[3px] text-[10px] leading-none font-semibold">
                    {w.jlptLevel}
                  </span>
                )}
                <div className="flex flex-row gap-0.5">
                  {(
                    [
                      { Icon: Languages, starred: w.starred, level: w.level },
                      {
                        Icon: Waves,
                        starred: w.pronStarred,
                        level: w.pronLevel,
                      },
                      {
                        Icon: BookOpen,
                        starred: w.meaningStarred,
                        level: w.meaningLevel,
                      },
                    ] as const
                  ).map(({ Icon, starred, level }, i) => (
                    <div
                      key={i}
                      className="bg-app-muted flex items-center gap-0.5 rounded-full px-1 py-0.5"
                    >
                      <Icon
                        size={10}
                        strokeWidth={2}
                        className="text-app-text-secondary"
                      />
                      {starred ? (
                        <div
                          className="flex h-3 w-3 items-center justify-center rounded-full text-[7px] font-bold"
                          style={{ background: themeVars.star, color: "white" }}
                        >
                          ★
                        </div>
                      ) : (
                        <div
                          className="flex h-3 w-3 items-center justify-center rounded-full text-[7px] font-bold text-white"
                          style={{ background: themeVars.level(level) }}
                        >
                          {level}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {isOpen && (
              <div className="px-4 pt-0 pb-3">
                {w.description ? (
                  <p className="text-app-text-secondary text-xs leading-relaxed whitespace-pre-wrap">
                    {w.description}
                  </p>
                ) : (
                  <p className="text-app-text-muted text-xs italic">
                    {t("common.noDescription")}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
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
