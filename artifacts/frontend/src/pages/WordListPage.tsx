import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowUpDown,
  ArrowLeft,
  CheckSquare,
  Square,
  Trash2,
  Dices,
} from "lucide-react";
import { useLocation } from "wouter";
import { useWords } from "../hooks/useWords";
import { WordCard } from "../components/WordCard";
import { WordFormModal } from "../components/WordFormModal";
import { SearchBar } from "../components/SearchBar";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";
import { filterWords } from "../utils/filterWords";
import { clusterByKanji } from "../utils/kanjiCluster";
import { Word } from "../types";
import { startStudy } from "../store/studyStore";
import { useTranslation } from "../i18n/I18nProvider";

type SortMode =
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

function sortWords(words: Word[], sorts: Set<SortMode>): Word[] {
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

export function WordListPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const {
    words,
    isLoading,
    isError,
    updateWord,
    deleteWord,
    deleteWords,
  } = useWords();

  const sortOptions: { value: SortMode; label: string; group: SortGroup }[] = [
    { value: "level-asc", label: t("words.sort.levelAsc"), group: "level" },
    { value: "level-desc", label: t("words.sort.levelDesc"), group: "level" },
    { value: "date-asc", label: t("words.sort.dateAsc"), group: "date" },
    { value: "date-desc", label: t("words.sort.dateDesc"), group: "date" },
    { value: "jlpt-asc", label: t("words.sort.jlptAsc"), group: "jlpt" },
    { value: "jlpt-desc", label: t("words.sort.jlptDesc"), group: "jlpt" },
    { value: "kanji-cluster", label: t("words.sort.kanjiCluster"), group: "kanji" },
  ];

  const groups: { key: SortGroup; label: string }[] = [
    { key: "jlpt", label: t("common.jlpt") },
    { key: "level", label: t("common.level") },
    { key: "date", label: t("common.date") },
    { key: "kanji", label: t("common.clustering") },
  ];

  const [showForm, setShowForm] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | undefined>(undefined);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [activeSorts, setActiveSorts] = useState<Set<SortMode>>(
    new Set<SortMode>(["level-asc"]),
  );
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const headerRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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

  async function handleBulkDelete() {
    if (
      !window.confirm(
        t("common.confirmBulkDelete", { count: selectedIds.size }),
      )
    )
      return;
    await deleteWords(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  function handleSave(data: {
    kanji: string;
    pronunciation: string;
    meaning: string;
    description: string;
    srsExamples?: import("../types").SrsExample[];
    level: number;
    jlptLevel: string | null;
    date: string;
    relatedWordIds: number[];
  }) {
    if (editingWord) updateWord(editingWord.id, data);
    setEditingWord(undefined);
  }

  function handleDelete(id: number) {
    if (window.confirm(t("common.confirmDeleteWord"))) {
      deleteWord(id);
      setOpenIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  }

  const nonStarred = words.filter((w) => !w.starred);
  const sorted = sortWords(nonStarred, activeSorts);
  const displayed = filterWords(sorted, query);
  const activeSortCount = activeSorts.size;

  return (
    <div className="min-h-dvh bg-white">
      <div className="max-w-2xl mx-auto pb-28 sm:border-l sm:border-r sm:border-gray-100">
        <div
          ref={headerRef}
          className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-4 pb-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 p-1 -ml-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">
                {t("words.title")}
              </span>
            </button>
            <button
              onClick={() => {
                if (displayed.length === 0) return;
                startStudy(displayed, "kelime", t("words.studyTitle"), "/words");
                navigate("/study");
              }}
              disabled={displayed.length === 0}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-30"
            >
              <Dices size={17} strokeWidth={2} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-400 shrink-0 min-w-[1.25rem] flex items-center justify-center">
              {isLoading ? (
                <LoadingSpinner size={18} />
              ) : (
                t("common.wordCount", { count: displayed.length })
              )}
            </p>
            <div className="flex-1 min-w-0">
              <SearchBar value={query} onChange={setQuery} />
            </div>
            <div className="relative shrink-0" ref={sortMenuRef}>
              <button
                onClick={() => setShowSortMenu((v) => !v)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${activeSortCount > 0 ? "text-main-400 bg-main-50 hover:bg-main-100" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
              >
                <ArrowUpDown size={14} strokeWidth={2} />
                <span className="text-xs font-medium">
                  {activeSortCount > 1
                    ? t("common.sortWithCount", { count: activeSortCount })
                    : t("common.sort")}
                </span>
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-56">
                  {groups.map((group, gi) => (
                    <div key={group.key}>
                      {gi > 0 && (
                        <div className="mx-3 my-1.5 border-t border-gray-100" />
                      )}
                      <div className="px-3 pt-2.5 pb-1">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
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
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
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
                                  className="text-gray-300 shrink-0"
                                  strokeWidth={2}
                                />
                              )}
                              <span
                                className={
                                  active
                                    ? "text-gray-800 font-medium"
                                    : "text-gray-500"
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
                    <div className="mx-3 mb-2.5 mt-1.5 px-2.5 py-1.5 bg-main-50 rounded-lg">
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
              onClick={() =>
                selectMode ? exitSelectMode() : setSelectMode(true)
              }
              className={`shrink-0 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors ${selectMode ? "text-main-400 bg-main-50" : "text-gray-400 hover:bg-gray-50"}`}
            >
              {selectMode ? t("common.cancel") : t("common.select")}
            </button>
          </div>
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
                  <p className="text-4xl text-gray-200 mb-3">?</p>
                  <p className="text-gray-400 text-sm">
                    {t("common.noResultsForQuery", { query })}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4 text-gray-200">漢</div>
                  <p className="text-gray-400 font-medium">
                    {t("words.empty")}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white overflow-hidden">
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
                  onUpdate={updateWord}
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
                  allWords={words}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectMode && (
        <div className="max-w-2xl mx-auto sm:border-l sm:border-r sm:border-gray-100 fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSelectedIds(new Set(displayed.map((w) => w.id)))}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            {t("common.selectAll")}
          </button>
          <span className="flex-1 text-center text-sm text-gray-500 font-medium">
            {selectedIds.size > 0
              ? t("common.selectedCount", { count: selectedIds.size })
              : t("common.selectRows")}
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 px-3 bg-[rgb(239,68,68)] py-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40 shrink-0"
          >
            <Trash2 size={14} />
            {t("common.delete")}
          </button>
        </div>
      )}

      {showForm && editingWord && (
        <WordFormModal
          initial={editingWord}
          allWords={words}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingWord(undefined);
          }}
        />
      )}
    </div>
  );
}
