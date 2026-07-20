import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import type { CategorySummary } from "../hooks/useCategories";
import { useTranslation } from "../i18n/I18nProvider";
import { CategoryIcon } from "./CategoryIcon";

interface Props {
  categories: CategorySummary[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export function CategoriesSelect({ categories, selectedIds, onChange }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = categories.filter((c) => selectedIds.includes(c.id));
  const filtered = categories.filter(
    (c) =>
      !selectedIds.includes(c.id) &&
      c.name.toLowerCase().includes(query.toLowerCase()),
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

  function removeCategory(id: number) {
    onChange(selectedIds.filter((sid) => sid !== id));
  }

  function addCategory(cat: CategorySummary) {
    onChange([...selectedIds, cat.id]);
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
      removeCategory(selectedIds[selectedIds.length - 1]!);
    }
  }

  const showDropdown = isOpen && (filtered.length > 0 || query.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="border-app-border-strong bg-app-muted focus-within:ring-main-300 flex min-h-10.5 w-full cursor-text flex-wrap items-center gap-2 rounded-xl border px-3 py-2 transition-all focus-within:border-transparent focus-within:ring-2"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selected.map((cat) => (
          <span
            key={cat.id}
            className="bg-main-100 text-main-600 dark:bg-main-950 dark:text-main-300 inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold select-none"
          >
            <CategoryIcon svg={cat.iconSvg} size={16} />
            <span className="truncate">{cat.name}</span>
            <button
              type="button"
              aria-label={t("a11y.remove")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                removeCategory(cat.id);
              }}
              className="hover:bg-main-200/60 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all active:scale-90"
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
          placeholder={
            selected.length === 0 ? t("categories.selectPlaceholder") : ""
          }
          className="text-app-text placeholder:text-app-text-muted min-w-[90px] flex-1 bg-transparent text-sm focus:outline-none"
        />
      </div>

      {showDropdown && (
        <div
          className="border-app-border bg-app-surface absolute z-50 mt-1 w-full overflow-y-auto rounded-xl border shadow-lg"
          style={{ maxHeight: 220 }}
        >
          {filtered.length === 0 ? (
            <p className="text-app-text-muted px-4 py-3 text-center text-xs">
              {t("categories.selectNotFound", { query })}
            </p>
          ) : (
            filtered.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addCategory(cat)}
                className="hover:bg-main-50 dark:hover:bg-main-950 active:bg-main-100 flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
              >
                <CategoryIcon svg={cat.iconSvg} size={16} />
                <span className="text-app-text min-w-0 flex-1 truncate text-sm font-semibold">
                  {cat.name}
                </span>
                <span className="text-app-text-muted shrink-0 text-[11px]">
                  {cat.wordCount}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
