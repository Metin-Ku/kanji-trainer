import { useState, useEffect } from "react";
import { Word, WordUpdate } from "../types";
import { LevelChart } from "./LevelChart";
import { KanjiStrokeModal } from "./KanjiStrokeModal";
import { RelatedWordsList, RelatedWordsButton } from "./RelatedWordsList";
import { Pencil, Trash2 } from "lucide-react";

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
  allWords?: Word[];
}

function hasKanji(str: string): boolean {
  return [...str].some((c) => {
    const cp = c.codePointAt(0) ?? 0;
    return (
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0xf900 && cp <= 0xfaff)
    );
  });
}

export function WordCard({
  word, index, isOpen, onToggle, onUpdate, onDelete, onEdit, cardRef,
  selectMode = false, isSelected = false, onSelect, allWords,
}: Props) {
  const [showStroke, setShowStroke] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  useEffect(() => { if (!isOpen) setShowRelated(false); }, [isOpen]);
  const kanjiClickable = hasKanji(word.kanji) && !selectMode;

  function handleRowClick() {
    if (selectMode) { onSelect?.(); return; }
    onToggle();
  }

  return (
    <>
      <div ref={cardRef} className="border-b border-gray-100 last:border-b-0">
        <div
          className="flex items-center gap-2.5 px-4 py-3 select-none cursor-pointer"
          onClick={handleRowClick}
        >
          {selectMode ? (
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
              style={{
                borderColor: isSelected ? "rgb(251,146,60)" : "#d1d5db",
                background: isSelected ? "rgb(251,146,60)" : "transparent",
              }}
            >
              {isSelected && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          ) : (
            <span className="text-gray-300 font-medium text-sm w-5 text-right shrink-0 tabular-nums">
              {index}
            </span>
          )}

          <LevelChart
            level={word.level}
            starred={word.starred}
            onChangeLevel={(l) => { if (!selectMode) onUpdate(word.id, { level: l }); }}
            onToggleStar={() => { if (!selectMode) onUpdate(word.id, { starred: !word.starred }); }}
          />

          <span
            className={[
              "text-lg font-bold leading-none shrink-0",
              kanjiClickable
                ? "text-gray-800 active:text-main-400 transition-colors"
                : "text-gray-800",
            ].join(" ")}
            style={kanjiClickable ? { cursor: "zoom-in" } : {}}
            onClick={
              kanjiClickable
                ? (e) => { e.stopPropagation(); setShowStroke(true); }
                : undefined
            }
          >
            {word.kanji}
          </span>

          {/* JLPT badge inline in the row */}
          {word.jlptLevel && !selectMode && (
            <span
              className="text-[10px] font-semibold leading-none px-1.5 py-[3px] rounded-md shrink-0"
              style={{ background: "#f3f4f6", color: "#6b7280" }}
            >
              {word.jlptLevel}
            </span>
          )}

          <span className="flex-1" />

          {!selectMode && (
            <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                className="p-1.5 rounded-lg text-gray-300 hover:text-blue-400 transition-colors"
                onClick={() => onEdit(word)}
                aria-label="Düzenle"
              >
                <Pencil size={14} />
              </button>
              <button
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 transition-colors"
                onClick={() => onDelete(word.id)}
                aria-label="Sil"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {!selectMode && (
          <div className={`word-detail ${isOpen ? "open" : ""}`}>
            <div className="px-5 pb-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-400 font-medium">
                  {showRelated ? "" : formatDate(word.date)}
                </p>
                {word.meaning && allWords && (
                  <RelatedWordsButton
                    active={showRelated}
                    onClick={(e) => { e.stopPropagation(); setShowRelated((v) => !v); }}
                  />
                )}
              </div>
              {showRelated && word.meaning && allWords ? (
                <RelatedWordsList word={word} allWords={allWords} />
              ) : (
                <>
                  {word.pronunciation && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-400 text-xs uppercase tracking-wide mr-2">Okunuş</span>
                      {word.pronunciation}
                    </p>
                  )}
                  {word.meaning && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-400 text-xs uppercase tracking-wide mr-2">Anlam</span>
                      {word.meaning}
                    </p>
                  )}
                  {word.description && (
                    <div className="pt-1 border-t border-gray-100">
                      <div className="whitespace-pre-wrap text-[15px] text-gray-700 leading-relaxed font-[inherit]">
                        {word.description}
                      </div>
                    </div>
                  )}
                  {!word.pronunciation && !word.meaning && !word.description && (
                    <span className="text-gray-300 italic text-sm">Açıklama yok</span>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showStroke && (
        <KanjiStrokeModal kanji={word.kanji} onClose={() => setShowStroke(false)} />
      )}
    </>
  );
}

function formatDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
    return `${d} ${months[m - 1]} ${y}`;
  } catch {
    return dateStr;
  }
}
