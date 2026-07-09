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

export function CategoriesSelect({
  categories,
  selectedIds,
  onChange,
}: Props) {
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
        className="min-h-[44px] w-full rounded-xl border border-app-border-strong bg-app-muted px-3 py-2 flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-main-300 focus-within:border-transparent transition-all cursor-text"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selected.map((cat) => (
          <span
            key={cat.id}
            className="bg-main-100 text-main-600 dark:bg-main-950 dark:text-main-300 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold select-none max-w-full"
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
              className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-main-200/60 transition-all active:scale-90 shrink-0"
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
          className="flex-1 min-w-[90px] bg-transparent text-sm text-app-text focus:outline-none placeholder:text-app-text-muted"
        />
      </div>

      {showDropdown && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl border border-app-border bg-app-surface shadow-lg overflow-y-auto"
          style={{ maxHeight: 220 }}
        >
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-xs text-app-text-muted text-center">
              {t("categories.selectNotFound", { query })}
            </p>
          ) : (
            filtered.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addCategory(cat)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-main-50 dark:hover:bg-main-950 active:bg-main-100 transition-colors text-left"
              >
                <CategoryIcon svg={cat.iconSvg} size={16} />
                <span className="text-sm font-semibold text-app-text flex-1 min-w-0 truncate">
                  {cat.name}
                </span>
                <span className="text-[11px] text-app-text-muted shrink-0">
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
