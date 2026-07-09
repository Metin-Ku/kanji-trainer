import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { filterWords } from "../utils/filterWords";
import type { Word } from "../types";
import { useTranslation } from "../i18n/I18nProvider";

type WordPickerModalProps = {
  allWords: Word[];
  selectedIds: Set<number>;
  onChange: (ids: Set<number>) => void;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
};

function SelectionCircle({ checked }: { checked: boolean }) {
  return (
    <div
      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors border-app-border-strong ${
        checked ? "border-main-500 bg-main-500" : "transparent"
      }`}
    >
      {checked && (
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
  );
}

export function WordPickerModal({
  allWords,
  selectedIds,
  onChange,
  onClose,
  onConfirm,
  title,
}: WordPickerModalProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  const displayed = useMemo(
    () => filterWords(allWords, query),
    [allWords, query],
  );

  function toggle(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) onClose();
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-app-surface w-full sm:max-w-lg max-h-[85dvh] rounded-t-2xl sm:rounded-2xl border border-app-border flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-app-border shrink-0">
          <h2 className="text-sm font-bold text-app-text">
            {title ?? t("themes.pickWords")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-app-muted text-app-text-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-app-border shrink-0">
          <SearchBar value={query} onChange={setQuery} />
          <p className="text-xs text-app-text-muted mt-2">
            {t("themes.selectedWordCount", { count: selectedIds.size })}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {displayed.map((word) => {
            const checked = selectedIds.has(word.id);
            return (
              <button
                key={word.id}
                type="button"
                onClick={() => toggle(word.id)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-app-border text-left hover:bg-app-muted/50 transition-colors"
              >
                <SelectionCircle checked={checked} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-app-text truncate">{word.kanji}</p>
                  <p className="text-xs text-app-text-muted truncate">
                    {word.pronunciation || word.meaning || t("common.emDash")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-app-border shrink-0 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-app-border-strong text-sm font-semibold text-app-text-secondary"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => (onConfirm ? onConfirm() : onClose())}
            className="flex-1 py-2.5 rounded-xl bg-main-500 text-white text-sm font-semibold"
          >
            {t("common.add")}
          </button>
        </div>
      </div>
    </div>
  );
}
