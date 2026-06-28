import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Trash2, ArrowUpDown, CheckSquare, Square, Dices } from "lucide-react";
import { useLocation } from "wouter";
import { useWords } from "../hooks/useWords";
import { WordCard } from "../components/WordCard";
import { WordFormModal } from "../components/WordFormModal";
import { SearchBar } from "../components/SearchBar";
import { filterWords } from "../utils/filterWords";
import { clusterByKanji } from "../utils/kanjiCluster";
import { Word } from "../types";
import { startStudy } from "../store/studyStore";

type SortMode = "date-asc" | "date-desc" | "jlpt-asc" | "jlpt-desc" | "kanji-cluster";
type SortGroup = "jlpt" | "date" | "kanji";

const SORT_OPTIONS: { value: SortMode; label: string; group: SortGroup }[] = [
  { value: "jlpt-asc",      label: "N5 → N1 (Kolay → Zor)", group: "jlpt"  },
  { value: "jlpt-desc",     label: "N1 → N5 (Zor → Kolay)", group: "jlpt"  },
  { value: "date-asc",      label: "Tarih: Eski → Yeni",     group: "date"  },
  { value: "date-desc",     label: "Tarih: Yeni → Eski",     group: "date"  },
  { value: "kanji-cluster", label: "Ortak Kanji Kümeleme",   group: "kanji" },
];

const GROUPS: { key: SortGroup; label: string }[] = [
  { key: "jlpt",  label: "JLPT"     },
  { key: "date",  label: "Tarih"    },
  { key: "kanji", label: "Kümeleme" },
];

const JLPT_RANK: Record<string, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
function jlptRank(w: Word): number { return w.jlptLevel ? (JLPT_RANK[w.jlptLevel] ?? 99) : 99; }

function sortLearned(words: Word[], sort: SortMode): Word[] {
  const arr = [...words];
  if (sort === "jlpt-asc")      return arr.sort((a, b) => jlptRank(a) - jlptRank(b));
  if (sort === "jlpt-desc")     return arr.sort((a, b) => jlptRank(b) - jlptRank(a));
  if (sort === "date-asc")      return arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (sort === "date-desc")     return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (sort === "kanji-cluster") return clusterByKanji(arr);
  return arr;
}

export function LearnedPage() {
  const [, navigate] = useLocation();
  const { words, isLoading, updateWord, deleteWord, deleteWords } = useWords();
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sort, setSort] = useState<SortMode>("date-desc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | undefined>(undefined);

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
    if (!window.confirm(`${selectedIds.size} kelimeyi silmek istediğinizden emin misiniz?`)) return;
    await deleteWords(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  function handleDelete(id: number) {
    if (window.confirm("Bu kelimeyi silmek istediğinizden emin misiniz?")) {
      deleteWord(id);
      setOpenIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  function handleSave(data: { kanji: string; pronunciation: string; meaning: string; description: string; level: number; jlptLevel: string | null; date: string }) {
    if (editingWord) updateWord(editingWord.id, data);
    setEditingWord(undefined);
    setShowForm(false);
  }

  const starred = words.filter((w) => w.starred);
  const displayed = filterWords(sortLearned(starred, sort), query);

  return (
    <div className="min-h-dvh bg-white">
      <div className="max-w-2xl mx-auto pb-28">
        <div ref={headerRef} className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-4 pb-3 space-y-2">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/learned")} className="flex items-center gap-1.5 p-1 -ml-1 text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft size={18} />
              <span className="text-[11px] font-semibold text-orange-400 uppercase tracking-widest">Öğrenilenler</span>
            </button>
            <button
              onClick={() => { if (displayed.length === 0) return; startStudy(displayed, "kelime", "Öğrenilenler", "/learned/words"); navigate("/study"); }}
              disabled={displayed.length === 0}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-30"
            >
              <Dices size={17} strokeWidth={2} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-400 shrink-0">{isLoading ? "…" : `${displayed.length} kelime`}</p>
            <div className="flex-1"><SearchBar value={query} onChange={setQuery} /></div>

            <div className="relative shrink-0" ref={sortMenuRef}>
              <button
                onClick={() => setShowSortMenu((v) => !v)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-orange-400 bg-orange-50 hover:bg-orange-100 transition-colors"
              >
                <ArrowUpDown size={14} strokeWidth={2} />
                <span className="text-xs font-medium">Sırala</span>
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-56">
                  {GROUPS.map((group, gi) => (
                    <div key={group.key}>
                      {gi > 0 && <div className="mx-3 my-1.5 border-t border-gray-100" />}
                      <div className="px-3 pt-2.5 pb-1"><p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{group.label}</p></div>
                      {SORT_OPTIONS.filter((o) => o.group === group.key).map((opt) => (
                        <button key={opt.value} onClick={() => { setSort(opt.value); setShowSortMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50">
                          {sort === opt.value ? <CheckSquare size={15} className="text-orange-400 shrink-0" strokeWidth={2} /> : <Square size={15} className="text-gray-300 shrink-0" strokeWidth={2} />}
                          <span className={sort === opt.value ? "text-gray-800 font-medium" : "text-gray-500"}>{opt.label}</span>
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
              className={`shrink-0 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors ${selectMode ? "text-orange-400 bg-orange-50" : "text-gray-400 hover:bg-gray-50"}`}
            >
              {selectMode ? "İptal" : "Seç"}
            </button>
          </div>
        </div>

        {!isLoading && displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-5xl text-gray-200 mb-3">★</p>
            {query
              ? <p className="text-gray-400 text-sm">"{query}" için sonuç bulunamadı</p>
              : <p className="text-gray-400 text-sm">Henüz öğrenilen kelime yok.<br/>Seviye 5'te ★ tuşuna basarak ekleyebilirsiniz.</p>
            }
          </div>
        ) : (
          <div className="bg-white overflow-hidden">
            {displayed.map((word, i) => (
              <WordCard
                key={word.id}
                word={word}
                index={i + 1}
                isOpen={openIds.has(word.id)}
                onToggle={() => setOpenIds((prev) => { const n = new Set(prev); n.has(word.id) ? n.delete(word.id) : n.add(word.id); return n; })}
                onUpdate={updateWord}
                onDelete={handleDelete}
                onEdit={(w) => { setEditingWord(w); setShowForm(true); }}
                cardRef={(el) => { if (el) cardRefs.current.set(word.id, el); else cardRefs.current.delete(word.id); }}
                selectMode={selectMode}
                isSelected={selectedIds.has(word.id)}
                onSelect={() => setSelectedIds((prev) => { const n = new Set(prev); n.has(word.id) ? n.delete(word.id) : n.add(word.id); return n; })}
                allWords={words}
              />
            ))}
          </div>
        )}
      </div>

      {selectMode && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSelectedIds(new Set(displayed.map((w) => w.id)))} className="text-xs text-gray-500 shrink-0">Tümünü Seç</button>
          <span className="flex-1 text-center text-sm text-gray-500 font-medium">{selectedIds.size > 0 ? `${selectedIds.size} seçildi` : "Satır seçin"}</span>
          <button onClick={handleBulkDelete} disabled={selectedIds.size === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 shrink-0" style={{ background: "rgb(239,68,68)" }}>
            <Trash2 size={14} />Sil
          </button>
        </div>
      )}

      {showForm && editingWord && (
        <WordFormModal initial={editingWord} onSave={handleSave} onClose={() => { setShowForm(false); setEditingWord(undefined); }} />
      )}
    </div>
  );
}
