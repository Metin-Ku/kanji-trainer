import { useMemo, useState } from "react";
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

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-app-surface w-full sm:max-w-lg max-h-[85dvh] rounded-t-2xl sm:rounded-2xl border border-app-border flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-app-border shrink-0">
          <h2 className="text-sm font-bold text-app-text">
            {title ?? t("themes.pickWords")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-app-text-muted hover:bg-app-muted"
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
              <label
                key={word.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-app-border cursor-pointer hover:bg-app-muted/50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(word.id)}
                  className="rounded border-app-border-strong text-main-500 focus:ring-main-300"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-app-text truncate">{word.kanji}</p>
                  <p className="text-xs text-app-text-muted truncate">
                    {word.pronunciation || word.meaning || t("common.emDash")}
                  </p>
                </div>
              </label>
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
