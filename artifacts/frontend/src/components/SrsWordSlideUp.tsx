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
  onSave?: (
    data: WordUpdate & { relatedWordIds: number[]; categoryIds: number[] },
  ) => void;
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
        className="bg-app-surface border-app-border pointer-events-auto fixed right-0 left-0 z-40 mx-auto max-w-2xl rounded-t-2xl border-t shadow-xl sm:border-r sm:border-l"
        style={{
          bottom,
          maxHeight: "55vh",
          overflowY: "auto",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="bg-app-border-strong h-1 w-10 rounded-full" />
        </div>
        <div
          className={`relative px-6 pt-2 pb-4 ${showRelated && word.meaning ? "" : "pr-24"}`}
        >
          <div className="absolute top-2 right-5 flex flex-row items-center gap-2">
            {onSave && (
              <button
                type="button"
                onClick={() => setShowEdit(true)}
                className="bg-app-muted text-app-text-secondary flex h-8 w-10 items-center justify-center rounded-lg px-3 py-1.5"
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
                  <p className="text-app-text-muted mb-1 text-[10px] font-bold tracking-widest uppercase">
                    {t("common.word")}
                  </p>
                  <p className="text-app-text text-3xl font-bold">
                    {word.kanji}
                  </p>
                </div>
              )}
              {word.pronunciation && (
                <div>
                  <p className="text-app-text-muted mb-1 text-[10px] font-bold tracking-widest uppercase">
                    {t("common.pronunciation")}
                  </p>
                  <p className="text-app-text text-lg font-medium">
                    {word.pronunciation}
                  </p>
                </div>
              )}
              {word.meaning && (
                <div>
                  <p className="text-app-text-muted mb-1 text-[10px] font-bold tracking-widest uppercase">
                    {t("common.meaning")}
                  </p>
                  <p className="text-app-text text-base">{word.meaning}</p>
                </div>
              )}
              {word.description && (
                <div className="border-app-border border-t pt-3">
                  <p className="text-app-text-muted mb-1 text-[10px] font-bold tracking-widest uppercase">
                    {t("common.description")}
                  </p>
                  <p className="text-app-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
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
