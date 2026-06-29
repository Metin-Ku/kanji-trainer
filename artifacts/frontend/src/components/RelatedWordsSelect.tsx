import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import type { Word } from "../types";

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
        className="min-h-[44px] w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-main-300 focus-within:border-transparent transition-all cursor-text"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selectedWords.map((w) => (
          <span
            key={w.id}
            className="bg-main-100 text-main-600 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-bold select-none"
          >
            {w.kanji}
            <button
              type="button"
              aria-label="Kaldır"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                removeWord(w.id);
              }}
              className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-main-200/60 transition-all active:scale-90"
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
          placeholder={selectedWords.length === 0 ? "Kelime ara…" : ""}
          className="flex-1 min-w-[90px] bg-transparent text-sm text-gray-700 focus:outline-none placeholder:text-gray-300"
        />
      </div>

      {showDropdown && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl border border-gray-100 bg-white shadow-lg overflow-y-auto"
          style={{ maxHeight: 220 }}
        >
          {filteredWords.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-300 text-center">
              "{query}" bulunamadı
            </p>
          ) : (
            filteredWords.map((w) => (
              <button
                key={w.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addWord(w)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-main-50 active:bg-main-100 transition-colors text-left"
              >
                <span className="text-base font-bold text-gray-800 shrink-0">
                  {w.kanji}
                </span>
                <span className="text-xs text-gray-400 truncate flex-1">
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
