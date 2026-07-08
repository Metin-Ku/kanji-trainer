import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Trash2, ArrowUpDown, CheckSquare, Square, Dices } from "lucide-react";
import { useLocation } from "wouter";
import { useWords } from "../hooks/useWords";
import { Word, WordUpdate } from "../types";
import { LevelChart } from "../components/LevelChart";
import { RelatedWordsList, RelatedWordsButton } from "../components/RelatedWordsList";
import { SearchBar } from "../components/SearchBar";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";
import { filterWords } from "../utils/filterWords";
import { clusterByKanji } from "../utils/kanjiCluster";
import { startStudy } from "../store/studyStore";
import { useTranslation } from "../i18n/I18nProvider";

type SortMode = "level-asc" | "level-desc" | "date-asc" | "date-desc" | "jlpt-asc" | "jlpt-desc" | "kanji-cluster";
type SortGroup = "jlpt" | "level" | "date" | "kanji";

const JLPT_RANK: Record<string, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
function jlptRank(w: Word): number { return w.jlptLevel ? (JLPT_RANK[w.jlptLevel] ?? 99) : 99; }

function sortWords(words: Word[], sort: SortMode): Word[] {
  const arr = [...words];
  if (sort === "jlpt-asc")   return arr.sort((a, b) => jlptRank(a) - jlptRank(b) || a.pronLevel - b.pronLevel);
  if (sort === "jlpt-desc")  return arr.sort((a, b) => jlptRank(b) - jlptRank(a) || a.pronLevel - b.pronLevel);
  if (sort === "level-asc")  return arr.sort((a, b) => a.pronLevel - b.pronLevel || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (sort === "level-desc") return arr.sort((a, b) => b.pronLevel - a.pronLevel || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (sort === "date-asc")      return arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (sort === "date-desc")     return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (sort === "kanji-cluster") return clusterByKanji(arr);
  return arr;
}

function PronCard({
  word, index, isOpen, onToggle, onUpdate, selectMode, isSelected, onSelect, cardRef, allWords,
}: {
  word: Word; index: number; isOpen: boolean;
  onToggle: () => void; onUpdate: (id: number, patch: WordUpdate) => void;
  selectMode: boolean; isSelected: boolean; onSelect: () => void;
  cardRef?: (el: HTMLDivElement | null) => void;
  allWords?: Word[];
}) {
  const { t } = useTranslation();
  const [showRelated, setShowRelated] = useState(false);
  useEffect(() => { if (!isOpen) setShowRelated(false); }, [isOpen]);
  return (
    <div ref={cardRef} className="border-b border-app-border last:border-b-0">
      <div className="flex items-center gap-2.5 px-4 py-3 cursor-pointer select-none" onClick={selectMode ? onSelect : onToggle}>
        {selectMode ? (
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "border-main-500 bg-main-500" : "border-app-border-strong bg-transparent"}`}
          >
            {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
        ) : (
          <span className="text-app-text-muted font-medium text-sm w-5 text-right shrink-0 tabular-nums">{index}</span>
        )}
        <LevelChart
          level={word.pronLevel}
          starred={word.pronStarred}
          onChangeLevel={(l) => !selectMode && onUpdate(word.id, { pronLevel: l })}
          onToggleStar={() => !selectMode && onUpdate(word.id, { pronStarred: !word.pronStarred })}
        />
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-app-text leading-none truncate">
            {word.pronunciation || <span className="text-app-text-muted italic font-normal text-sm">{t("common.noPronunciation")}</span>}
          </p>
        </div>
        {word.jlptLevel && !selectMode && (
          <span className="text-[10px] bg-app-muted text-app-text-secondary font-semibold leading-none px-1.5 py-[3px] rounded-md shrink-0">
            {word.jlptLevel}
          </span>
        )}
      </div>
      {!selectMode && (
        <div className={`word-detail ${isOpen ? "open" : ""}`}>
          <div className="px-5 pb-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {!showRelated && word.kanji && <p className="text-2xl font-bold text-app-text">{word.kanji}</p>}
                {!showRelated && word.meaning && <p className="text-sm text-app-text-secondary mt-0.5">{word.meaning}</p>}
              </div>
              {word.meaning && allWords && (
                <RelatedWordsButton
                  active={showRelated}
                  onClick={(e) => { e.stopPropagation(); setShowRelated((v) => !v); }}
                />
              )}
            </div>
            {showRelated && word.meaning && allWords ? (
              <RelatedWordsList word={word} allWords={allWords} />
            ) : (
              word.description && (
                <div className="pt-1.5 border-t border-app-border">
                  <p className="whitespace-pre-wrap text-sm text-app-text-secondary leading-relaxed">{word.description}</p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function LearnedPronPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { words, isLoading, updateWord, deleteWords } = useWords();

  const sortOptions: { value: SortMode; label: string; group: SortGroup }[] = [
    { value: "jlpt-asc", label: t("learned.sort.jlptAsc"), group: "jlpt" },
    { value: "jlpt-desc", label: t("learned.sort.jlptDesc"), group: "jlpt" },
    { value: "level-asc", label: t("learned.sort.levelAsc"), group: "level" },
    { value: "level-desc", label: t("learned.sort.levelDesc"), group: "level" },
    { value: "date-asc", label: t("learned.sort.dateAsc"), group: "date" },
    { value: "date-desc", label: t("learned.sort.dateDesc"), group: "date" },
    { value: "kanji-cluster", label: t("learned.sort.kanjiCluster"), group: "kanji" },
  ];

  const groups: { key: SortGroup; label: string }[] = [
    { key: "jlpt", label: t("common.jlpt") },
    { key: "level", label: t("common.level") },
    { key: "date", label: t("common.date") },
    { key: "kanji", label: t("common.clustering") },
  ];
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("level-asc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const headerRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!showSortMenu) return;
    function handler(e: MouseEvent | TouchEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setShowSortMenu(false);
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
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
        if (el && el.getBoundingClientRect().bottom <= headerBottom) { next.delete(id); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [selectMode]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  function exitSelectMode() { setSelectMode(false); setSelectedIds(new Set()); }

  async function handleBulkDelete() {
    if (!window.confirm(t("common.confirmBulkDelete", { count: selectedIds.size }))) return;
    await deleteWords(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  const starred = words.filter((w) => w.pronStarred);
  const displayed = filterWords(sortWords(starred, sort), query);

  return (
    <div className="min-h-dvh bg-app-surface">
      <div className="max-w-2xl mx-auto pb-8 sm:border-l sm:border-r sm:border-app-border">
        <div ref={headerRef} className="sticky top-0 z-10 bg-app-surface border-b border-app-border px-5 pt-4 pb-4 space-y-2">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/learned")} className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted hover:text-app-text-secondary transition-colors">
              <ArrowLeft size={18} />
              <span className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">{t("nav.learnedPronunciation")}</span>
            </button>
            <button
              onClick={() => { if (displayed.length === 0) return; startStudy(displayed, "okunuş", t("learned.studyPronunciationTitle"), "/learned/pronunciation"); navigate("/study"); }}
              disabled={displayed.length === 0}
              className="p-1.5 rounded-lg text-app-text-muted hover:bg-app-muted transition-colors disabled:opacity-30"
            >
              <Dices size={17} strokeWidth={2} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-app-text-muted shrink-0 min-w-[1.25rem] flex items-center justify-center">
              {isLoading ? (
                <LoadingSpinner size={18} />
              ) : (
                t("common.wordCount", { count: displayed.length })
              )}
            </p>
            <div className="flex-1"><SearchBar value={query} onChange={setQuery} /></div>

            <div className="relative shrink-0" ref={sortMenuRef}>
              <button
                onClick={() => setShowSortMenu((v) => !v)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-main-400 bg-main-50 hover:bg-main-100 dark:bg-main-950 dark:hover:bg-main-900 transition-colors"
              >
                <ArrowUpDown size={14} strokeWidth={2} />
                <span className="text-xs font-medium">{t("common.sort")}</span>
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1.5 z-50 bg-app-surface rounded-xl shadow-xl border border-app-border overflow-hidden w-56">
                  {groups.map((group, gi) => (
                    <div key={group.key}>
                      {gi > 0 && <div className="mx-3 my-1.5 border-t border-app-border" />}
                      <div className="px-3 pt-2.5 pb-1"><p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest">{group.label}</p></div>
                      {sortOptions.filter((o) => o.group === group.key).map((opt) => (
                        <button key={opt.value} onClick={() => { setSort(opt.value); setShowSortMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-app-muted">
                          {sort === opt.value ? <CheckSquare size={15} className="text-main-400 shrink-0" strokeWidth={2} /> : <Square size={15} className="text-app-text-muted shrink-0" strokeWidth={2} />}
                          <span className={sort === opt.value ? "text-app-text font-medium" : "text-app-text-secondary"}>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                  <div className="h-2" />
                </div>
              )}
            </div>

            <button
              onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
              className={`shrink-0 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors ${selectMode ? "text-main-400 bg-main-50 dark:bg-main-950" : "text-app-text-muted hover:bg-app-muted"}`}
            >
              {selectMode ? t("common.cancel") : t("common.select")}
            </button>
          </div>
        </div>

        <div>
          {isLoading ? (
            <LoadingPlaceholder padding="lg" />
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-5xl text-app-border-strong mb-3">★</p>
              {query
                ? <p className="text-app-text-muted text-sm">{t("common.noResultsForQuery", { query })}</p>
                : <p className="text-app-text-muted text-sm">{t("learned.empty")}</p>
              }
            </div>
          ) : (
            <div className="bg-app-surface overflow-hidden">
              {displayed.map((word, i) => (
                <PronCard
                  key={word.id} word={word} index={i + 1}
                  isOpen={openIds.has(word.id)}
                  onToggle={() => setOpenIds((prev) => { const n = new Set(prev); n.has(word.id) ? n.delete(word.id) : n.add(word.id); return n; })}
                  onUpdate={updateWord}
                  selectMode={selectMode} isSelected={selectedIds.has(word.id)}
                  onSelect={() => setSelectedIds((prev) => { const n = new Set(prev); n.has(word.id) ? n.delete(word.id) : n.add(word.id); return n; })}
                  cardRef={(el) => { if (el) cardRefs.current.set(word.id, el); else cardRefs.current.delete(word.id); }}
                  allWords={words}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectMode && (
        <div className="max-w-2xl mx-auto sm:border-l sm:border-r sm:border-app-border fixed bottom-0 left-0 right-0 z-50 bg-app-surface border-t border-app-border-strong px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSelectedIds(new Set(displayed.map((w) => w.id)))} className="text-xs text-app-text-secondary shrink-0">{t("common.selectAll")}</button>
          <span className="flex-1 text-center text-sm text-app-text-secondary font-medium">{selectedIds.size > 0 ? t("common.selectedCount", { count: selectedIds.size }) : t("common.selectRows")}</span>
          <button onClick={handleBulkDelete} disabled={selectedIds.size === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 shrink-0" style={{ background: "rgb(239,68,68)" }}>
            <Trash2 size={14} />{t("common.delete")}
          </button>
        </div>
      )}
    </div>
  );
}
