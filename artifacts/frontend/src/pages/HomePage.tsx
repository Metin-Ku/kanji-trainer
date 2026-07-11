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
  BarChart2,
  ChevronRight,
  Blocks,
  Tags,
  SquareStack
} from "lucide-react";
import { SearchBar } from "../components/SearchBar";
import { DailyGoalCard } from "../components/DailyGoalCard";
import { WordAddFab } from "../components/WordAddFab";
import { BulkImportModal } from "../components/BulkImportModal";
import { useWords } from "../hooks/useWords";
import { useThemes } from "../hooks/useThemes";
import { useCategories } from "../hooks/useCategories";
import { filterWords } from "../utils/filterWords";
import {
  RelatedWordsList,
  RelatedWordsButton,
} from "../components/RelatedWordsList";
import { WordFormModal } from "../components/WordFormModal";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";
import { MiniHeatmapStrip } from "../components/progress/MiniHeatmapStrip";
import { useStudyHistory } from "../hooks/useStudyHistory";
import type { Word } from "../types";
import { themeVars } from "../theme";
import { useTranslation } from "../i18n/I18nProvider";
import { useConfirm } from "../components/ConfirmProvider";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DAILY_GOAL_DECK_IDS } from "../lib/dailyGoal";

const STUDY_LINKS = [
  { path: "/words", Icon: Languages, titleKey: "nav.words" as const },
  {
    path: "/pronunciation",
    Icon: Waves,
    titleKey: "nav.pronunciation" as const,
  },
  { path: "/meaning", Icon: BookOpen, titleKey: "nav.meaning" as const },
  { path: "/learned", Icon: null, titleKey: "nav.learned" as const },
  { path: "/categories", Icon: SquareStack, titleKey: "nav.categories" as const },
  { path: "/themes", Icon: Blocks, titleKey: "nav.themes" as const },
  { path: "/srs", Icon: Layers, titleKey: "nav.decks" as const },
] as const;

export function HomePage() {
  const { t, formatToday } = useTranslation();
  const confirm = useConfirm();
  const [, navigate] = useLocation();
  const { words, isLoading, updateWord, deleteWord, addWord, bulkCreate } =
    useWords();
  const { themes, isLoading: themesLoading } = useThemes();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const activityByDate = useStudyHistory();
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
    categoryIds: number[];
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

  const studyCounts: Record<(typeof STUDY_LINKS)[number]["titleKey"], number> =
    {
      "nav.words": nonStarredCount,
      "nav.pronunciation": words.length,
      "nav.meaning": words.length,
      "nav.learned": starredCount,
      "nav.themes": themes.length,
      "nav.decks": DAILY_GOAL_DECK_IDS.length,
      "nav.categories": categories.length,
    };

  function studyCountLabel(titleKey: (typeof STUDY_LINKS)[number]["titleKey"]) {
    const count = studyCounts[titleKey];
    if (titleKey === "nav.themes") return t("common.themeCount", { count });
    if (titleKey === "nav.decks") return t("common.deckCount", { count });
    if (titleKey === "nav.categories") return t("common.categoryCount", { count });
    return t("common.wordCount", { count });
  }

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
    <div className="min-h-dvh max-w-2xl mx-auto bg-app-bg flex flex-col sm:border-l sm:border-r sm:border-app-border">
      <div className="bg-app-surface border-b border-app-border px-5 pt-4 pb-5 shrink-0">
        <div className="flex items-center justify-between gap-3 mb-0.5">
          <p className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">
            {t("home.appSubtitle")}
          </p>
          <div className="flex items-center gap-0.5 -mr-2 -mt-1">
            <button
              onClick={() => navigate("/srs")}
              className="p-2 rounded-xl text-app-text-muted hover:text-main-500 hover:bg-app-accent transition-colors"
              aria-label={t("a11y.srs")}
            >
              <Layers size={20} strokeWidth={2} />
            </button>
            <button
              onClick={() => navigate("/progress")}
              className="p-2 rounded-xl text-app-text-muted hover:text-main-500 hover:bg-app-accent transition-colors"
              aria-label={t("a11y.progress")}
            >
              <BarChart2 size={20} strokeWidth={2} />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="p-2 rounded-xl text-app-text-muted hover:text-main-500 hover:bg-app-accent transition-colors"
              aria-label={t("a11y.settings")}
            >
              <Settings size={20} strokeWidth={2} />
            </button>
          </div>
        </div>
        <h1 className="text-xl font-bold text-app-text mb-3">
          {formatToday()}
        </h1>
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={t("home.searchPlaceholder")}
        />
        {!isSearching && (
          <>
            <DailyGoalCard />
            <div className="mt-3">
              <MiniHeatmapStrip activityByDate={activityByDate} />
            </div>
          </>
        )}
      </div>

      {isSearching ? (
        <div className="flex-1 overflow-y-auto bg-app-surface">
          {isLoading ? (
            <LoadingPlaceholder />
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <p className="text-4xl text-app-border-strong mb-3">?</p>
              <p className="text-app-text-muted text-sm">
                {t("common.noResultsForQuery", { query })}
              </p>
            </div>
          ) : (
            <div>
              <p className="px-5 pt-3 pb-1 text-xs text-app-text-muted font-medium">
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
                    className="border-b border-app-border last:border-b-0"
                  >
                    <div
                      className="flex items-center gap-3 px-5 py-3 select-none cursor-pointer"
                      onClick={() => hasDetail && toggleOpen(word.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-app-text leading-none">
                          {word.kanji}
                        </p>
                        {word.pronunciation && (
                          <p className="text-xs text-app-text-secondary mt-0.5">
                            {word.pronunciation}
                          </p>
                        )}
                        {word.meaning && (
                          <p className="text-xs text-app-text-muted mt-0.5 truncate">
                            {word.meaning}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {word.jlptLevel && (
                          <span className="text-[11px] bg-app-muted text-app-text-secondary font-semibold leading-none px-1.5 py-[3px] rounded-md shrink-0">
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
                              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-app-surface"
                            >
                              <Icon
                                size={13}
                                strokeWidth={2}
                                className="text-app-text-secondary"
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
                          className="p-1.5 rounded-lg bg-app-muted active:opacity-60 transition-opacity"
                          style={{ background: "bg-app-muted" }}
                        >
                          <Pencil
                            size={13}
                            strokeWidth={2}
                            className="text-app-text-secondary"
                          />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (
                              await confirm(
                                t("home.confirmDelete", { kanji: word.kanji }),
                              )
                            )
                              deleteWord(word.id);
                          }}
                          className="p-1.5 rounded-lg bg-app-muted active:opacity-60 transition-opacity"
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
                              <div className="whitespace-pre-wrap text-[14px] text-app-text leading-relaxed font-[inherit]">
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
      ) : (
        // <div className="flex-1 flex items-center justify-center p-3">
        //   <LoadingPlaceholder padding="lg" />
        // </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-24">
          <p className="text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-2.5 px-1">
            {t("home.studySection")}
          </p>
          <div className="space-y-2">
            {STUDY_LINKS.map(({ path, Icon, titleKey }) => {
              const star = titleKey === "nav.learned";
              const countLoading =
                titleKey === "nav.themes"
                  ? themesLoading
                  : titleKey === "nav.categories"
                    ? categoriesLoading
                    : titleKey === "nav.decks"
                      ? false
                      : isLoading;
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  disabled={
                    isLoading ||
                    (titleKey === "nav.themes" && themesLoading) ||
                    (titleKey === "nav.categories" && categoriesLoading)
                  }
                  className="w-full flex items-center gap-4 bg-app-surface rounded-2xl border border-app-border px-4 py-3.5 active:scale-[0.99] transition-transform disabled:opacity-60"
                >
                  <div className="w-10 h-10 rounded-xl bg-app-accent flex items-center justify-center shrink-0">
                    {star ? (
                      // <span style={{ color: themeVars.star, fontSize: 18 }}>
                      <span className="text-main-500">
                        ★
                      </span>
                    ) : (
                      Icon && (
                        <Icon
                          size={18}
                          className="text-main-500"
                          strokeWidth={1.8}
                        />
                      )
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-base font-bold text-app-text">
                      {t(titleKey)}
                    </p>
                    <div className="flex items-center gap-1">
                      {countLoading ? (
                        <>
                          <LoadingSpinner
                            size={14}
                            className="text-app-text-muted"
                          />
                          <p className="text-xs text-app-text-muted mt-0.5 invisible">
                            {studyCountLabel(titleKey)}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-app-text-muted mt-0.5">
                          {studyCountLabel(titleKey)}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-app-text-muted shrink-0"
                  />
                </button>
              );
            })}
          </div>
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
