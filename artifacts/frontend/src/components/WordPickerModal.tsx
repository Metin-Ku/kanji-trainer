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
      className={`border-app-border-strong flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
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
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-app-surface border-app-border flex max-h-[85dvh] w-full flex-col rounded-t-2xl border shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="border-app-border flex shrink-0 items-center justify-between border-b px-4 py-3">
          <h2 className="text-app-text text-sm font-bold">
            {title ?? t("themes.pickWords")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-app-muted text-app-text-muted rounded-full p-1.5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-app-border shrink-0 border-b px-4 py-3">
          <SearchBar value={query} onChange={setQuery} />
          <p className="text-app-text-muted mt-2 text-xs">
            {t("themes.selectedWordCount", { count: selectedIds.size })}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {displayed.map((word) => {
            const checked = selectedIds.has(word.id);
            return (
              <button
                key={word.id}
                type="button"
                onClick={() => toggle(word.id)}
                className="border-app-border hover:bg-app-muted/50 flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors"
              >
                <SelectionCircle checked={checked} />
                <div className="min-w-0 flex-1">
                  <p className="text-app-text truncate font-bold">
                    {word.kanji}
                  </p>
                  <p className="text-app-text-muted truncate text-xs">
                    {word.pronunciation || word.meaning || t("common.emDash")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="border-app-border flex shrink-0 gap-2 border-t px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="border-app-border-strong text-app-text-secondary flex-1 rounded-xl border py-2.5 text-sm font-semibold"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => (onConfirm ? onConfirm() : onClose())}
            className="bg-main-500 flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
          >
            {t("common.add")}
          </button>
        </div>
      </div>
    </div>
  );
}
