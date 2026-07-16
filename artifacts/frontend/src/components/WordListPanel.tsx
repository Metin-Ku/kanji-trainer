import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  ArrowUpDown,
  CheckSquare,
  Square,
  Trash2,
  Dices,
} from "lucide-react";
import { useLocation } from "wouter";
import { WordCard } from "./WordCard";
import { WordFormModal } from "./WordFormModal";
import { SearchBar } from "./SearchBar";
import { LoadingSpinner } from "./LoadingSpinner";
import { LoadingPlaceholder } from "./LoadingPlaceholder";
import { filterWords } from "../utils/filterWords";
import { clusterByKanji } from "../utils/kanjiCluster";
import type { Word, WordUpdate } from "../types";
import { startStudy } from "../store/studyStore";
import { useTranslation } from "../i18n/I18nProvider";
import { pageTitleLabelClass } from "../lib/japaneseScript";
import { useConfirm } from "../components/ConfirmProvider";
import {
  getWordsListPrefs,
  saveWordsListPrefs,
} from "../lib/listPreferences";

export type SortMode =
  | "level-asc"
  | "level-desc"
  | "date-asc"
  | "date-desc"
  | "jlpt-asc"
  | "jlpt-desc"
  | "kanji-cluster";
type SortGroup = "level" | "date" | "jlpt" | "kanji";

const JLPT_RANK: Record<string, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
function jlptRank(w: Word): number {
  return w.jlptLevel ? (JLPT_RANK[w.jlptLevel] ?? 99) : 99;
}

function buildComparator(
  sorts: Set<SortMode>,
): ((a: Word, b: Word) => number) | undefined {
  const levelDir = sorts.has("level-asc")
    ? "asc"
    : sorts.has("level-desc")
      ? "desc"
      : null;
  const dateDir = sorts.has("date-asc")
    ? "asc"
    : sorts.has("date-desc")
      ? "desc"
      : null;
  const jlptDir = sorts.has("jlpt-asc")
    ? "asc"
    : sorts.has("jlpt-desc")
      ? "desc"
      : null;
  if (!levelDir && !dateDir && !jlptDir) return undefined;
  return (a: Word, b: Word) => {
    if (jlptDir) {
      const d = jlptRank(a) - jlptRank(b);
      if (d !== 0) return jlptDir === "asc" ? d : -d;
    }
    if (levelDir) {
      const d = a.level - b.level;
      if (d !== 0) return levelDir === "asc" ? d : -d;
    }
    if (dateDir) {
      const d =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (d !== 0) return dateDir === "asc" ? d : -d;
    }
    return 0;
  };
}

export function sortWords(words: Word[], sorts: Set<SortMode>): Word[] {
  const cmp = buildComparator(sorts);
  if (sorts.has("kanji-cluster")) return clusterByKanji(words, cmp);
  const arr = [...words];
  if (!cmp) return arr;
  return arr.sort(cmp);
}

function toggleSort(
  prev: Set<SortMode>,
  value: SortMode,
  sortOptions: { value: SortMode; group: SortGroup }[],
): Set<SortMode> {
  const next = new Set(prev);
  const opt = sortOptions.find((o) => o.value === value)!;
  const others = sortOptions
    .filter((o) => o.group === opt.group && o.value !== value)
    .map((o) => o.value);
  if (next.has(value)) {
    next.delete(value);
  } else {
    others.forEach((o) => next.delete(o));
    next.add(value);
  }
  return next;
}

export type WordListPanelProps = {
  words: Word[];
  allWords: Word[];
  isLoading?: boolean;
  isError?: boolean;
  emptyMessage?: string;
  studyTitle: string;
  studyReturnPath: string;
  onUpdate: (id: number, patch: WordUpdate) => void;
  onDelete: (id: number) => void;
  onBulkDelete?: (ids: number[]) => void | Promise<void>;
  bulkMode?: "delete" | "remove";
  onBulkRemove?: (ids: number[]) => void | Promise<void>;
  bulkRemoveLabel?: string;
  showDice?: boolean;
  toolbarExtra?: React.ReactNode;
  /** Full-page layout: sticky header with back + dice row (matches Pronunciation/Meaning). */
  layout?: "embedded" | "page";
  pageTitle?: string;
  pageTitleIcon?: React.ReactNode;
  onBack?: () => void;
};

export function WordListPanel({
  words,
  allWords,
  isLoading = false,
  isError = false,
  emptyMessage,
  studyTitle,
  studyReturnPath,
  onUpdate,
  onDelete,
  onBulkDelete,
  bulkMode = "delete",
  onBulkRemove,
  bulkRemoveLabel,
  showDice = true,
  toolbarExtra,
  layout = "embedded",
  pageTitle,
  pageTitleIcon,
  onBack,
}: WordListPanelProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [, navigate] = useLocation();

  const sortOptions: { value: SortMode; label: string; group: SortGroup }[] = [
    { value: "level-asc", label: t("words.sort.levelAsc"), group: "level" },
    { value: "level-desc", label: t("words.sort.levelDesc"), group: "level" },
    { value: "date-asc", label: t("words.sort.dateAsc"), group: "date" },
    { value: "date-desc", label: t("words.sort.dateDesc"), group: "date" },
    { value: "jlpt-asc", label: t("words.sort.jlptAsc"), group: "jlpt" },
    { value: "jlpt-desc", label: t("words.sort.jlptDesc"), group: "jlpt" },
    {
      value: "kanji-cluster",
      label: t("words.sort.kanjiCluster"),
      group: "kanji",
    },
  ];

  const groups: { key: SortGroup; label: string }[] = [
    { key: "jlpt", label: t("common.jlpt") },
    { key: "level", label: t("common.level") },
    { key: "date", label: t("common.date") },
    { key: "kanji", label: t("common.clustering") },
  ];

  const prefsScope = studyReturnPath;
  const defaultPrefs = { query: "", sorts: ["level-asc"] as SortMode[] };
  const savedPrefs = getWordsListPrefs(prefsScope, defaultPrefs);

  const [showForm, setShowForm] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | undefined>(undefined);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [activeSorts, setActiveSorts] = useState<Set<SortMode>>(
    () => new Set<SortMode>(savedPrefs.sorts),
  );
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [query, setQuery] = useState(savedPrefs.query);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const headerRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    saveWordsListPrefs(prefsScope, {
      query,
      sorts: [...activeSorts],
    });
  }, [prefsScope, query, activeSorts]);

  useEffect(() => {
    if (!showSortMenu) return;
    function handler(e: MouseEvent | TouchEvent) {
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(e.target as Node)
      )
        setShowSortMenu(false);
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showSortMenu]);

  const handleScroll = useCallback(() => {
    if (!headerRef.current || selectMode) return;
    const headerBottom = headerRef.current.getBoundingClientRect().bottom;
    setOpenIds((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set(prev);
      for (const id of prev) {
        const el = cardRefs.current.get(id);
        if (el && el.getBoundingClientRect().bottom <= headerBottom) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectMode]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleBulkAction() {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (bulkMode === "remove" && onBulkRemove) {
      if (
        !(await confirm({
          message: t("themes.confirmRemoveWords", { count: ids.length }),
          confirmLabel: t("themes.removeFromTheme"),
        }))
      )
        return;
      await onBulkRemove(ids);
    } else {
      if (
        !(await confirm(t("common.confirmBulkDelete", { count: ids.length })))
      )
        return;
      if (onBulkDelete) await onBulkDelete(ids);
    }
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  async function handleDelete(id: number) {
    if (!(await confirm(t("common.confirmDeleteWord")))) return;
    onDelete(id);
    setOpenIds((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  }

  const sorted = sortWords(words, activeSorts);
  const displayed = filterWords(sorted, query);
  const activeSortCount = activeSorts.size;
  const diceInHeader = layout === "page" && showDice;

  const diceButton = showDice ? (
    <button
      onClick={() => {
        if (displayed.length === 0) return;
        startStudy(displayed, "kelime", studyTitle, studyReturnPath);
        navigate("/study");
      }}
      disabled={displayed.length === 0}
      className="p-1.5 rounded-lg text-app-text-muted hover:bg-app-muted transition-colors disabled:opacity-30 shrink-0"
    >
      <Dices size={17} strokeWidth={2} />
    </button>
  ) : null;

  const toolbarRow = (
    <div className="flex items-center gap-2">
      <p className="text-sm text-app-text-muted shrink-0 min-w-[1.25rem] flex items-center justify-center">
        {isLoading ? (
          <LoadingSpinner size={18} />
        ) : (
          t("common.wordCount", { count: displayed.length })
        )}
      </p>
      <div className="flex-1 min-w-0">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {!diceInHeader && diceButton}
      <div className="relative shrink-0" ref={sortMenuRef}>
        <button
          onClick={() => setShowSortMenu((v) => !v)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${activeSortCount > 0 ? "text-main-400 bg-main-50 hover:bg-main-100 dark:bg-main-950 dark:hover:bg-main-900" : "text-app-text-muted hover:text-app-text-secondary hover:bg-app-muted"}`}
        >
          <ArrowUpDown size={14} strokeWidth={2} />
          <span className="text-xs font-medium">
            {activeSortCount > 1
              ? t("common.sortWithCount", { count: activeSortCount })
              : t("common.sort")}
          </span>
        </button>
        {showSortMenu && (
          <div className="absolute right-0 top-full mt-1.5 z-50 bg-app-surface rounded-xl shadow-xl border border-app-border overflow-hidden w-56">
            {groups.map((group, gi) => (
              <div key={group.key}>
                {gi > 0 && (
                  <div className="mx-3 my-1.5 border-t border-app-border" />
                )}
                <div className="px-3 pt-2.5 pb-1">
                  <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest">
                    {group.label}
                  </p>
                </div>
                {sortOptions
                  .filter((o) => o.group === group.key)
                  .map((opt) => {
                    const active = activeSorts.has(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setActiveSorts((p) =>
                            toggleSort(p, opt.value, sortOptions),
                          )
                        }
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-app-muted transition-colors"
                      >
                        {active ? (
                          <CheckSquare
                            size={15}
                            className="text-main-400 shrink-0"
                            strokeWidth={2}
                          />
                        ) : (
                          <Square
                            size={15}
                            className="text-app-text-muted shrink-0"
                            strokeWidth={2}
                          />
                        )}
                        <span
                          className={
                            active
                              ? "text-app-text font-medium"
                              : "text-app-text-secondary"
                          }
                        >
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
              </div>
            ))}
            {activeSortCount > 1 && (
              <div className="mx-3 mb-2.5 mt-1.5 px-2.5 py-1.5 bg-main-50 dark:bg-main-950 rounded-lg">
                <p className="text-[11px] text-main-400 font-medium">
                  {t("words.sort.multiCriteria", { count: activeSortCount })}
                </p>
              </div>
            )}
            <div className="h-1" />
          </div>
        )}
      </div>
      <button
        onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
        className={`shrink-0 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors ${selectMode ? "text-main-400 bg-main-50 dark:bg-main-950" : "text-app-text-muted hover:bg-app-muted"}`}
      >
        {selectMode ? t("common.cancel") : t("common.select")}
      </button>
    </div>
  );

  return (
    <>
      <div
        ref={headerRef}
        className={
          layout === "page"
            ? "sticky top-0 z-10 bg-app-surface border-b border-app-border px-5 pt-4 pb-4 space-y-2"
            : "space-y-2"
        }
      >
        {layout === "page" && (
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted hover:text-app-text-secondary transition-colors min-w-0"
            >
              <ArrowLeft size={18} className="shrink-0" />
              {pageTitle && (
                <span className={pageTitleLabelClass(pageTitle)}>
                  {pageTitleIcon}
                  <span className="truncate">{pageTitle}</span>
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 ml-auto mr-2">
              {toolbarExtra}
            </div>
            <span className="text-sm text-app-text-muted p-1.5 font-medium tabular-nums invisible">
              5
            </span>
            {diceButton}
          </div>
        )}
        {toolbarRow}
      </div>

      {isError && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-400 text-center">
          {t("words.loadError")}
        </div>
      )}

      <div>
        {isLoading ? (
          <LoadingPlaceholder padding="lg" />
        ) : displayed.length === 0 && !isError ? (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
            {query ? (
              <>
                <p className="text-4xl text-app-border-strong mb-3">?</p>
                <p className="text-app-text-muted text-sm">
                  {t("common.noResultsForQuery", { query })}
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4 text-app-border-strong">漢</div>
                <p className="text-app-text-muted font-medium">
                  {emptyMessage ?? t("words.empty")}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-app-surface overflow-hidden">
            {displayed.map((word, i) => (
              <WordCard
                key={word.id}
                word={word}
                index={i + 1}
                isOpen={openIds.has(word.id)}
                onToggle={() =>
                  setOpenIds((prev) => {
                    const n = new Set(prev);
                    n.has(word.id) ? n.delete(word.id) : n.add(word.id);
                    return n;
                  })
                }
                onUpdate={onUpdate}
                onDelete={handleDelete}
                onEdit={(w) => {
                  setEditingWord(w);
                  setShowForm(true);
                }}
                cardRef={(el) => {
                  if (el) cardRefs.current.set(word.id, el);
                  else cardRefs.current.delete(word.id);
                }}
                selectMode={selectMode}
                isSelected={selectedIds.has(word.id)}
                onSelect={() =>
                  setSelectedIds((prev) => {
                    const n = new Set(prev);
                    n.has(word.id) ? n.delete(word.id) : n.add(word.id);
                    return n;
                  })
                }
                allWords={allWords}
              />
            ))}
          </div>
        )}
      </div>

      {selectMode && (
        <div className="max-w-2xl mx-auto sm:box-content sm:border-l-2 sm:border-r-2 sm:border-app-border fixed bottom-0 left-0 right-0 z-50 bg-app-surface border-t border-app-border-strong px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSelectedIds(new Set(displayed.map((w) => w.id)))}
            className="text-xs text-app-text-secondary hover:text-app-text transition-colors shrink-0"
          >
            {t("common.selectAll")}
          </button>
          <span className="flex-1 text-center text-sm text-app-text-secondary font-medium">
            {selectedIds.size > 0
              ? t("common.selectedCount", { count: selectedIds.size })
              : t("common.selectRows")}
          </span>
          <button
            onClick={handleBulkAction}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 px-3 bg-[rgb(239,68,68)] py-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40 shrink-0"
          >
            <Trash2 size={14} />
            {bulkMode === "remove"
              ? (bulkRemoveLabel ?? t("themes.removeFromTheme"))
              : t("common.delete")}
          </button>
        </div>
      )}

      {showForm && editingWord && (
        <WordFormModal
          initial={editingWord}
          allWords={allWords}
          onSave={(data) => {
            onUpdate(editingWord.id, data);
            setShowForm(false);
            setEditingWord(undefined);
          }}
          onClose={() => {
            setShowForm(false);
            setEditingWord(undefined);
          }}
        />
      )}
    </>
  );
}
