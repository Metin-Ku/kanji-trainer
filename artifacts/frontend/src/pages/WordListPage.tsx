import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  ArrowUpDown,
  ArrowLeft,
  CheckSquare,
  Square,
  Copy,
  Trash2,
  Dices,
} from "lucide-react";
import { useLocation } from "wouter";
import { useWords } from "../hooks/useWords";
import { WordCard } from "../components/WordCard";
import { WordFormModal } from "../components/WordFormModal";
import { BulkImportModal } from "../components/BulkImportModal";
import { SearchBar } from "../components/SearchBar";
import { filterWords } from "../utils/filterWords";
import { clusterByKanji } from "../utils/kanjiCluster";
import { Word } from "../types";
import { startStudy } from "../store/studyStore";

type SortMode =
  | "level-asc"
  | "level-desc"
  | "date-asc"
  | "date-desc"
  | "jlpt-asc"
  | "jlpt-desc"
  | "kanji-cluster";
type SortGroup = "level" | "date" | "jlpt" | "kanji";

const SORT_OPTIONS: { value: SortMode; label: string; group: SortGroup }[] = [
  { value: "level-asc", label: "Seviye ↑", group: "level" },
  { value: "level-desc", label: "Seviye ↓", group: "level" },
  { value: "date-asc", label: "Tarih: Eski → Yeni", group: "date" },
  { value: "date-desc", label: "Tarih: Yeni → Eski", group: "date" },
  { value: "jlpt-asc", label: "N5 → N1 (Kolay → Zor)", group: "jlpt" },
  { value: "jlpt-desc", label: "N1 → N5 (Zor → Kolay)", group: "jlpt" },
  { value: "kanji-cluster", label: "Ortak Kanji Kümeleme", group: "kanji" },
];

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

function toggleSort(prev: Set<SortMode>, value: SortMode): Set<SortMode> {
  const next = new Set(prev);
  const opt = SORT_OPTIONS.find((o) => o.value === value)!;
  const others = SORT_OPTIONS.filter(
    (o) => o.group === opt.group && o.value !== value,
  ).map((o) => o.value);
  if (next.has(value)) {
    next.delete(value);
  } else {
    others.forEach((o) => next.delete(o));
    next.add(value);
  }
  return next;
}

const GROUPS: { key: SortGroup; label: string }[] = [
  { key: "jlpt", label: "JLPT" },
  { key: "level", label: "Seviye" },
  { key: "date", label: "Tarih" },
  { key: "kanji", label: "Kümeleme" },
];

export function WordListPage() {
  const [, navigate] = useLocation();
  const {
    words,
    isLoading,
    isError,
    addWord,
    updateWord,
    deleteWord,
    deleteWords,
    bulkCreate,
  } = useWords();
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | undefined>(undefined);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [activeSorts, setActiveSorts] = useState<Set<SortMode>>(
    new Set<SortMode>(["level-asc"]),
  );
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [fabOpen, setFabOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const headerRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!fabOpen) return;
    function handler(e: MouseEvent | TouchEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node))
        setFabOpen(false);
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [fabOpen]);

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
        `${selectedIds.size} kelimeyi silmek istediğinizden emin misiniz?`,
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
    level: number;
    jlptLevel: string | null;
    date: string;
    relatedWordIds: number[];
  }) {
    if (editingWord) updateWord(editingWord.id, data);
    else addWord(data);
    setEditingWord(undefined);
  }

  function handleDelete(id: number) {
    if (window.confirm("Bu kelimeyi silmek istediğinizden emin misiniz?")) {
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
                Kelimeler
              </span>
            </button>
            <button
              onClick={() => {
                if (displayed.length === 0) return;
                startStudy(displayed, "kelime", "Kelimeler", "/words");
                navigate("/study");
              }}
              disabled={displayed.length === 0}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-30"
            >
              <Dices size={17} strokeWidth={2} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-400 shrink-0">
              {isLoading ? "…" : `${displayed.length} kelime`}
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
                  Sırala{activeSortCount > 1 ? ` (${activeSortCount})` : ""}
                </span>
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-56">
                  {GROUPS.map((group, gi) => (
                    <div key={group.key}>
                      {gi > 0 && (
                        <div className="mx-3 my-1.5 border-t border-gray-100" />
                      )}
                      <div className="px-3 pt-2.5 pb-1">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                          {group.label}
                        </p>
                      </div>
                      {SORT_OPTIONS.filter((o) => o.group === group.key).map(
                        (opt) => {
                          const active = activeSorts.has(opt.value);
                          return (
                            <button
                              key={opt.value}
                              onClick={() =>
                                setActiveSorts((p) => toggleSort(p, opt.value))
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
                        },
                      )}
                    </div>
                  ))}
                  {activeSortCount > 1 && (
                    <div className="mx-3 mb-2.5 mt-1.5 px-2.5 py-1.5 bg-main-50 rounded-lg">
                      <p className="text-[11px] text-main-400 font-medium">
                        {activeSortCount} kriter uygulanıyor (önce seçilen)
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
              {selectMode ? "İptal" : "Seç"}
            </button>
          </div>
        </div>

        {isError && (
          <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-400 text-center">
            Kelimeler yüklenemedi.
          </div>
        )}

        <div>
          {!isLoading && displayed.length === 0 && !isError ? (
            <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
              {query ? (
                <>
                  <p className="text-4xl text-gray-200 mb-3">?</p>
                  <p className="text-gray-400 text-sm">
                    "{query}" için sonuç bulunamadı
                  </p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4 text-gray-200">漢</div>
                  <p className="text-gray-400 font-medium">
                    Henüz kelime eklenmedi
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
            Tümünü Seç
          </button>
          <span className="flex-1 text-center text-sm text-gray-500 font-medium">
            {selectedIds.size > 0
              ? `${selectedIds.size} seçildi`
              : "Satır seçin"}
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 px-3 bg-[rgb(239,68,68)] py-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40 shrink-0"
          >
            <Trash2 size={14} />
            Sil
          </button>
        </div>
      )}

      {!selectMode && (
        <div ref={fabRef} className="fixed right-5 z-40" style={{ bottom: 32 }}>
          <div
            className={`flex items-center rounded-full w-[52px] transition-[height] duration-140 ease-in-out overflow-hidden 
            shadow-[0_4px_20px] shadow-main-200 bg-linear-to-b 160deg from-main-400 to-main-600 flex-col-reverse ${fabOpen ? "h-[158px]" : "h-[52px]"}`}
          >
            <button
              onClick={() => setFabOpen((v) => !v)}
              className="flex items-center justify-center active:opacity-70 transition-opacity"
              style={{ width: 52, height: 52, flexShrink: 0 }}
            >
              <div
                style={{
                  transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)",
                  transition: "transform 0.12s ease",
                }}
              >
                <Plus size={22} strokeWidth={2.5} className="text-white" />
              </div>
            </button>
            <div
              style={{
                width: 28,
                height: 1,
                background: "rgba(255,255,255,0.3)",
                flexShrink: 0,
              }}
            />
            <button
              onClick={() => {
                setFabOpen(false);
                setEditingWord(undefined);
                setShowForm(true);
              }}
              className="flex items-center justify-center active:opacity-70 transition-opacity"
              style={{ width: 52, height: 52, flexShrink: 0 }}
            >
              <Plus size={22} strokeWidth={2.5} className="text-white" />
            </button>
            <div
              style={{
                width: 28,
                height: 1,
                background: "rgba(255,255,255,0.3)",
                flexShrink: 0,
              }}
            />
            <button
              onClick={() => {
                setFabOpen(false);
                setShowBulk(true);
              }}
              className="flex items-center justify-center active:opacity-70 transition-opacity"
              style={{ width: 52, height: 52, flexShrink: 0 }}
            >
              <Copy size={19} strokeWidth={2} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {showForm && (
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
      {showBulk && (
        <BulkImportModal
          onImport={bulkCreate}
          onClose={() => setShowBulk(false)}
        />
      )}
    </div>
  );
}
