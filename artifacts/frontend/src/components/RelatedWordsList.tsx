import { useState } from "react";
import { BookOpen, Languages, Waves } from "lucide-react";
import type { Word } from "../types";
import { themeVars } from "../theme";
import { useTranslation } from "../i18n/I18nProvider";

export function getRelatedWords(word: Word, allWords: Word[]): Word[] {
  if (!word.meaning) return [];

  const tokens = word.meaning
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);

  if (tokens.length === 0) return [];

  const seen = new Set<number>();
  const results: Word[] = [];

  for (const w of allWords) {
    if (w.id === word.id || seen.has(w.id) || !w.meaning) continue;

    const targetWords = w.meaning
      .split(/[,|\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length >= 4);

    const matched = tokens.some((token) => {
      const t = token.toLowerCase();
      return targetWords.some((tw) => tw.startsWith(t) || t.startsWith(tw));
    });

    if (matched) {
      seen.add(w.id);
      results.push(w);
    }
  }
  return results;
}

interface Props {
  word: Word;
  allWords: Word[];
}

export function RelatedWordsList({ word, allWords }: Props) {
  const { t } = useTranslation();
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  const manualIds = word.relatedWordIds ?? [];
  const manualWords = allWords.filter((w) => manualIds.includes(w.id));
  const autoWords = getRelatedWords(word, allWords).filter((w) => !manualIds.includes(w.id));
  const allRelated = [...manualWords, ...autoWords];

  function toggle(id: number) {
    setOpenIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  if (allRelated.length === 0) {
    return (
      <div className="border border-gray-100 rounded-lg bg-white px-4 py-3">
        <p className="text-xs text-gray-300 text-center">
          {t("common.relatedWordsNotFound")}
        </p>
      </div>
    );
  }

  const manualSet = new Set(manualIds);

  return (
    <div
      className="border border-gray-100 rounded-lg bg-white overflow-y-auto"
      style={{ maxHeight: 280 }}
      onClick={(e) => e.stopPropagation()}
    >
      {allRelated.map((w) => {
        const isOpen = openIds.has(w.id);
        const isManual = manualSet.has(w.id);
        return (
          <div key={w.id} className="border-b border-gray-50 last:border-b-0">
            <div
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
              onClick={() => toggle(w.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 leading-none">
                  <p className="text-sm font-bold text-gray-800">{w.kanji}</p>
                  {isManual && (
                    <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-main-100 text-main-600">
                      {t("common.manualLinkBadge")}
                    </span>
                  )}
                </div>
                {w.pronunciation && (
                  <p className="text-xs text-gray-500 mt-0.5">{w.pronunciation}</p>
                )}
                {w.meaning && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{w.meaning}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {w.jlptLevel && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 font-semibold leading-none px-1.5 py-[3px] rounded-md shrink-0">
                    {w.jlptLevel}
                  </span>
                )}
                <div className="flex flex-row gap-0.5">
                  {(
                    [
                      { Icon: Languages, starred: w.starred,        level: w.level        },
                      { Icon: Waves,     starred: w.pronStarred,    level: w.pronLevel    },
                      { Icon: BookOpen,  starred: w.meaningStarred, level: w.meaningLevel },
                    ] as const
                  ).map(({ Icon, starred, level }, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-gray-100"
                    >
                      <Icon size={10} strokeWidth={2} className="text-gray-500" />
                      {starred ? (
                        <div
                          className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold"
                          style={{ background: themeVars.star, color: "white" }}
                        >★</div>
                      ) : (
                        <div
                          className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                          style={{ background: themeVars.level(level) }}
                        >{level}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {isOpen && (
              <div className="px-4 pb-3 pt-0">
                {w.description ? (
                  <p className="whitespace-pre-wrap text-xs text-gray-600 leading-relaxed">{w.description}</p>
                ) : (
                  <p className="text-xs text-gray-300 italic">
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

export function RelatedWordsButton({ active, onClick, slideUp }: { active: boolean; onClick: (e: React.MouseEvent) => void; slideUp?: boolean }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={slideUp ? (e) => e.stopPropagation() : undefined}
      className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-bold transition-colors ${slideUp ? "h-8" : ""} ${
        active ? "bg-red-400 text-white" : "bg-main-100 text-main-400"
      }`}
      title={t("a11y.relatedWords")}
    >
      {t("common.relatedWordsButton")}
    </button>
  );
}
