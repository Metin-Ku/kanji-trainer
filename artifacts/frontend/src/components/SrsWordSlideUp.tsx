import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import type { Word } from "../types";
import { RelatedWordsButton, RelatedWordsList } from "./RelatedWordsList";
import { WordFormModal } from "./WordFormModal";
import type { WordUpdate } from "../types";
import { useTranslation } from "../i18n/I18nProvider";

interface Props {
  open: boolean;
  word: Word;
  allWords: Word[];
  onClose: () => void;
  onSave?: (data: WordUpdate & { relatedWordIds: number[] }) => void;
  bottom?: number;
}

export function SrsWordSlideUp({
  open,
  word,
  allWords,
  onClose,
  onSave,
  bottom = 0,
}: Props) {
  const { t } = useTranslation();
  const [showRelated, setShowRelated] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setShowRelated(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(t);
  }, [open]);

  if (!mounted) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/20 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed left-0 right-0 z-40 max-w-2xl mx-auto bg-white border-t border-gray-100 rounded-t-2xl shadow-xl sm:border-l sm:border-r pointer-events-auto"
        style={{
          bottom,
          maxHeight: "55vh",
          overflowY: "auto",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div
          className={`px-6 pb-4 pt-2 relative ${showRelated && word.meaning ? "" : "pr-24"}`}
        >
          <div className="absolute top-2 right-5 flex flex-row items-center gap-2">
            {onSave && (
              <button
                type="button"
                onClick={() => setShowEdit(true)}
                className="flex items-center justify-center px-3 py-1.5 w-10 h-8 rounded-lg bg-gray-100 text-gray-600"
              >
                <Pencil size={13} />
              </button>
            )}
            {word.meaning && allWords.length > 0 && (
              <RelatedWordsButton
                slideUp
                active={showRelated}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRelated((v) => !v);
                }}
              />
            )}
          </div>

          {showRelated && word.meaning ? (
            <div className="mt-10">
              <RelatedWordsList word={word} allWords={allWords} />
            </div>
          ) : (
            <div className="space-y-4">
              {word.kanji && (
                <div>
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1">
                    {t("common.word")}
                  </p>
                  <p className="text-3xl font-bold text-gray-800">{word.kanji}</p>
                </div>
              )}
              {word.pronunciation && (
                <div>
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1">
                    {t("common.pronunciation")}
                  </p>
                  <p className="text-lg font-medium text-gray-700">
                    {word.pronunciation}
                  </p>
                </div>
              )}
              {word.meaning && (
                <div>
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1">
                    {t("common.meaning")}
                  </p>
                  <p className="text-base text-gray-700">{word.meaning}</p>
                </div>
              )}
              {word.description && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1">
                    {t("common.description")}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-gray-600 leading-relaxed">
                    {word.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showEdit && onSave && (
        <WordFormModal
          initial={word}
          allWords={allWords}
          onSave={(data) => {
            onSave(data);
            setShowEdit(false);
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
