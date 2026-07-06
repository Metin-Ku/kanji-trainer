import { useState } from "react";
import { useLocation } from "wouter";
import {
  Settings,
  Layers,
  BookOpen,
  Waves,
  Languages,
  Pencil,
  Trash2,
} from "lucide-react";
import { SearchBar } from "../components/SearchBar";
import { DailyGoalCard } from "../components/DailyGoalCard";
import { WordAddFab } from "../components/WordAddFab";
import { BulkImportModal } from "../components/BulkImportModal";
import { useWords } from "../hooks/useWords";
import { filterWords } from "../utils/filterWords";
import {
  RelatedWordsList,
  RelatedWordsButton,
} from "../components/RelatedWordsList";
import { WordFormModal } from "../components/WordFormModal";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";
import type { Word } from "../types";
import { themeVars } from "../theme";
import { useTranslation } from "../i18n/I18nProvider";

const SHADOW = "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)";

export function HomePage() {
  const { t, formatToday } = useTranslation();
  const [, navigate] = useLocation();
  const { words, isLoading, updateWord, deleteWord, addWord, bulkCreate } = useWords();
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [relatedOpenIds, setRelatedOpenIds] = useState<Set<number>>(new Set());
  const [editingWord, setEditingWord] = useState<Word | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

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
    else addWord(data);
    setShowForm(false);
    setEditingWord(undefined);
  }

  function handleNewWord() {
    setEditingWord(undefined);
    setShowForm(true);
  }

  const results = filterWords(words, query);
  const isSearching = query.trim().length > 0;

  const starredCount = words.filter((w) => w.starred).length;
  const nonStarredCount = words.filter((w) => !w.starred).length;

  function toggleOpen(id: number) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setRelatedOpenIds((r) => {
          const n = new Set(r);
          n.delete(id);
          return n;
        });
      } else next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-dvh max-w-2xl mx-auto bg-gray-50 flex flex-col sm:border-l sm:border-r sm:border-gray-100">
      <div className="bg-white border-b border-gray-100 px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-start justify-between gap-3 mb-0.5">
          <p className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">
            {t("home.appSubtitle")}
          </p>
          <div className="flex items-center gap-0.5 -mr-2 -mt-1">
            <button
              onClick={() => navigate("/srs")}
              className="p-2 rounded-xl text-gray-400 hover:text-main-500 hover:bg-main-50 transition-colors"
              aria-label={t("a11y.srs")}
            >
              <Layers size={20} strokeWidth={2} />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="p-2 rounded-xl text-gray-400 hover:text-main-500 hover:bg-main-50 transition-colors"
              aria-label={t("a11y.settings")}
            >
              <Settings size={20} strokeWidth={2} />
            </button>
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-3">
          {formatToday()}
        </h1>
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={t("home.searchPlaceholder")}
        />
        {!isSearching && <DailyGoalCard />}
      </div>

      {isSearching ? (
        <div className="flex-1 overflow-y-auto bg-white">
          {isLoading ? (
            <LoadingPlaceholder />
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <p className="text-4xl text-gray-200 mb-3">?</p>
              <p className="text-gray-400 text-sm">
                {t("common.noResultsForQuery", { query })}
              </p>
            </div>
          ) : (
            <div>
              <p className="px-5 pt-3 pb-1 text-xs text-gray-400 font-medium">
                {t("common.resultCount", { count: results.length })}
              </p>
              {results.map((word) => {
                const isOpen = openIds.has(word.id);
                const isRelatedOpen = relatedOpenIds.has(word.id);
                const hasDetail = !!(
                  word.pronunciation ||
                  word.meaning ||
                  word.description
                );
                return (
                  <div
                    key={word.id}
                    className="border-b border-gray-100 last:border-b-0"
                  >
                    <div
                      className="flex items-center gap-3 px-5 py-3 select-none cursor-pointer"
                      onClick={() => hasDetail && toggleOpen(word.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-gray-800 leading-none">
                          {word.kanji}
                        </p>
                        {word.pronunciation && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {word.pronunciation}
                          </p>
                        )}
                        {word.meaning && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {word.meaning}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {word.jlptLevel && (
                          <span className="text-[11px] bg-gray-100 text-gray-500 font-semibold leading-none px-1.5 py-[3px] rounded-md shrink-0">
                            {word.jlptLevel}
                          </span>
                        )}
                        <div className="flex flex-row gap-1">
                          {(
                            [
                              {
                                Icon: Languages,
                                starred: word.starred,
                                level: word.level,
                              },
                              {
                                Icon: Waves,
                                starred: word.pronStarred,
                                level: word.pronLevel,
                              },
                              {
                                Icon: BookOpen,
                                starred: word.meaningStarred,
                                level: word.meaningLevel,
                              },
                            ] as const
                          ).map(({ Icon, starred, level }, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white"
                            >
                              <Icon
                                size={13}
                                strokeWidth={2}
                                className="text-gray-500"
                              />
                              {starred ? (
                                <div
                                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold"
                                  style={{
                                    background: themeVars.star,
                                    color: "rgb(255,255,255)",
                                  }}
                                >
                                  ★
                                </div>
                              ) : (
                                <div
                                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                  style={{ background: themeVars.level(level) }}
                                >
                                  {level}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWord(word);
                            setShowForm(true);
                          }}
                          className="p-1.5 rounded-lg bg-gray-100 active:opacity-60 transition-opacity"
                          style={{ background: "bg-gray-100" }}
                        >
                          <Pencil
                            size={13}
                            strokeWidth={2}
                            className="text-gray-500"
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(t("home.confirmDelete", { kanji: word.kanji })))
                              deleteWord(word.id);
                          }}
                          className="p-1.5 rounded-lg bg-gray-100 active:opacity-60 transition-opacity"
                        >
                          <Trash2
                            size={13}
                            strokeWidth={2}
                            className="text-red-500"
                          />
                        </button>
                      </div>
                    </div>

                    {(word.description || word.meaning) && (
                      <div className={`word-detail ${isOpen ? "open" : ""}`}>
                        <div className="px-5 pb-4 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span />
                            {word.meaning && (
                              <RelatedWordsButton
                                active={isRelatedOpen}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRelatedOpenIds((prev) => {
                                    const n = new Set(prev);
                                    n.has(word.id)
                                      ? n.delete(word.id)
                                      : n.add(word.id);
                                    return n;
                                  });
                                }}
                              />
                            )}
                          </div>
                          {isRelatedOpen && word.meaning ? (
                            <RelatedWordsList word={word} allWords={words} />
                          ) : (
                            word.description && (
                              <div className="whitespace-pre-wrap text-[14px] text-gray-700 leading-relaxed font-[inherit]">
                                {word.description}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center p-3">
          <LoadingPlaceholder padding="lg" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-2.5 p-3 overflow-hidden min-h-[clamp(500px,70vh,600px)]">
          <div className="flex-[2] flex flex-col gap-2.5 min-h-0">
            <button
              onClick={() => navigate("/words")}
              className="flex-1 flex flex-col items-center justify-center gap-1 bg-white rounded-2xl active:scale-[0.98] transition-transform min-h-0"
              style={{ boxShadow: SHADOW }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: themeVars.iconBg }}
              >
                <Languages
                  size={22}
                  className="text-main-400"
                  strokeWidth={1.8}
                />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900 leading-tight">
                  {t("home.tiles.wordsTitle")}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t("common.wordCount", { count: nonStarredCount })}
                </p>
              </div>
            </button>

            <div className="flex-1 flex gap-2.5 min-h-0">
              <button
                onClick={() => navigate("/pronunciation")}
                className="flex-1 flex flex-col items-center justify-center gap-2 bg-white rounded-2xl active:scale-[0.98] transition-transform min-h-0"
                style={{ boxShadow: SHADOW }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: themeVars.iconBg }}
                >
                  <Waves
                    size={20}
                    className="text-main-400"
                    strokeWidth={1.8}
                  />
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-gray-900 leading-tight">
                    {t("home.tiles.pronunciationTitle")}
                  </p>
                </div>
              </button>

              <button
                onClick={() => navigate("/meaning")}
                className="flex-1 flex flex-col items-center justify-center gap-2 bg-white rounded-2xl active:scale-[0.98] transition-transform min-h-0"
                style={{ boxShadow: SHADOW }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: themeVars.iconBg }}
                >
                  <BookOpen
                    size={20}
                    className="text-main-400"
                    strokeWidth={1.8}
                  />
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-gray-900 leading-tight">
                    {t("home.tiles.meaningTitle")}
                  </p>
                </div>
              </button>
            </div>
          </div>

          <button
            onClick={() => navigate("/learned")}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-white rounded-2xl active:scale-[0.98] transition-transform min-h-0"
            style={{ boxShadow: SHADOW }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: themeVars.iconBg }}
            >
              <span style={{ color: themeVars.level(1), fontSize: 20 }}>★</span>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900 leading-tight">
                {t("home.tiles.learnedTitle")}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {t("common.wordCount", { count: starredCount })}
              </p>
            </div>
          </button>
        </div>
      )}

      {!isSearching && (
        <WordAddFab
          onNewWord={handleNewWord}
          onBulkImport={() => setShowBulk(true)}
        />
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
          allWords={words}
        />
      )}
    </div>
  );
}
