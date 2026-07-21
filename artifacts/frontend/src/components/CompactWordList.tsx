import { useState } from "react";
import { BookOpen, Languages, Waves } from "lucide-react";
import type { Word } from "../types";
import { themeVars } from "../theme";
import { useTranslation } from "../i18n/I18nProvider";

interface Props {
  words: Word[];
  header?: React.ReactNode;
  emptyMessage?: string;
  maxHeight?: number;
}

export function CompactWordList({
  words,
  header,
  emptyMessage,
  maxHeight = 280,
}: Props) {
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
          {emptyMessage ?? t("progress.studiedWords.empty")}
        </p>
      </div>
    );
  }

  return (
    <div
      className="border-app-border bg-app-surface overflow-y-auto rounded-lg border"
      style={{ maxHeight }}
      onClick={(e) => e.stopPropagation()}
    >
      {header && (
        <p className="text-app-text-muted px-4 pt-3 pb-1 text-[10px] font-bold tracking-widest uppercase">
          {header}
        </p>
      )}
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
