import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import type { Word } from "../types";
import { useTranslation } from "../i18n/I18nProvider";

interface Props {
  allWords: Word[];
  selectedIds: number[];
  currentWordId?: number;
  onChange: (ids: number[]) => void;
}

export function RelatedWordsSelect({
  allWords,
  selectedIds,
  currentWordId,
  onChange,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedWords = allWords.filter((w) => selectedIds.includes(w.id));
  const filteredWords = allWords.filter(
    (w) =>
      w.id !== currentWordId &&
      !selectedIds.includes(w.id) &&
      (w.kanji.toLowerCase().includes(query.toLowerCase()) ||
        w.pronunciation.toLowerCase().includes(query.toLowerCase()) ||
        w.meaning.toLowerCase().includes(query.toLowerCase())),
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function removeWord(id: number) {
    onChange(selectedIds.filter((sid) => sid !== id));
  }

  function addWord(w: Word) {
    onChange([...selectedIds, w.id]);
    setQuery("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (
      (e.key === "Backspace" || e.key === "Delete") &&
      query === "" &&
      selectedIds.length > 0
    ) {
      e.preventDefault();
      removeWord(selectedIds[selectedIds.length - 1]);
    }
  }

  const showDropdown = isOpen && (filteredWords.length > 0 || query.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="border-app-border-strong bg-app-muted focus-within:ring-main-300 flex min-h-10.5 w-full cursor-text flex-wrap items-center gap-2 rounded-xl border px-3.5 py-2 transition-all focus-within:border-transparent focus-within:ring-2"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selectedWords.map((w) => (
          <span
            key={w.id}
            className="bg-main-100 text-main-600 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-bold select-none"
          >
            {w.kanji}
            <button
              type="button"
              aria-label={t("a11y.remove")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                removeWord(w.id);
              }}
              className="hover:bg-main-200/60 inline-flex h-5 w-5 items-center justify-center rounded-full transition-all active:scale-90"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedWords.length === 0 ? t("a11y.searchWords") : ""}
          className="text-app-text placeholder:text-app-text-muted min-w-[90px] flex-1 bg-transparent text-sm focus:outline-none"
        />
      </div>

      {showDropdown && (
        <div
          className="border-app-border bg-app-surface absolute z-50 mt-1 w-full overflow-y-auto rounded-xl border shadow-lg"
          style={{ maxHeight: 220 }}
        >
          {filteredWords.length === 0 ? (
            <p className="text-app-text-muted px-4 py-3 text-center text-xs">
              {t("search.relatedNotFound", { query })}
            </p>
          ) : (
            filteredWords.map((w) => (
              <button
                key={w.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addWord(w)}
                className="hover:bg-main-50 dark:hover:bg-main-950 active:bg-main-100 flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
              >
                <span className="text-app-text shrink-0 text-base font-bold">
                  {w.kanji}
                </span>
                <span className="text-app-text-muted flex-1 truncate text-xs">
                  {w.meaning || w.pronunciation}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
