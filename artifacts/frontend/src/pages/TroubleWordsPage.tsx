import { useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Dices,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "../i18n/I18nProvider";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";
import { srsDeckLabel } from "../i18n/srsDeckLabels";
import {
  useDismissTroubleWord,
  useTroubleWords,
  fetchTroubleSrsQueue,
  type TroubleDeckFilter,
  type TroubleWord,
} from "../hooks/useTroubleWords";
import { startSrsSession } from "../store/srsStore";
import type { SrsDeckType } from "../types/srs";

const DECK_FILTERS: TroubleDeckFilter[] = [
  "all",
  "word",
  "pronunciation",
  "meaning",
  "example",
];

function deckFilterLabel(
  t: (key: string) => string,
  filter: TroubleDeckFilter,
): string {
  if (filter === "all") return t("troubleWords.filterAll");
  return srsDeckLabel(t, filter).title;
}

function formatRelativeDate(
  iso: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return t("troubleWords.today");
  if (diffDays === 1) return t("troubleWords.yesterday");
  return t("troubleWords.daysAgo", { count: diffDays });
}

function TroubleWordRow({
  item,
  deckFilter,
  onDismiss,
}: {
  item: TroubleWord;
  deckFilter: TroubleDeckFilter;
  onDismiss: (wordId: number) => void;
}) {
  const { t } = useTranslation();

  const visibleDecks =
    deckFilter === "all"
      ? item.decks
      : item.decks.filter((d) => d.deckType === deckFilter);

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-app-border last:border-b-0 bg-app-surface">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-base font-bold text-app-text leading-tight">
            {item.kanji}
          </p>
          {item.jlptLevel && (
            <span className="text-[10px] bg-app-muted text-app-text-secondary font-semibold px-1.5 py-0.5 rounded-md">
              {item.jlptLevel}
            </span>
          )}
        </div>
        {item.pronunciation && (
          <p className="text-xs text-app-text-secondary mt-0.5">{item.pronunciation}</p>
        )}
        {item.meaning && (
          <p className="text-xs text-app-text-muted mt-0.5 truncate">{item.meaning}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {visibleDecks.map((d) => (
            <span
              key={d.deckType}
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100"
            >
              {srsDeckLabel(t, d.deckType).title}
              <span className="tabular-nums">×{d.mistakeCount}</span>
            </span>
          ))}
        </div>
        <p className="text-[10px] text-app-text-muted mt-1.5">
          {t("troubleWords.lastMistake", {
            when: formatRelativeDate(item.lastMistakeAt, t),
          })}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.wordId)}
        className="p-2 rounded-lg text-app-text-muted hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
        aria-label={t("troubleWords.dismiss")}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function TroubleWordsPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [deckFilter, setDeckFilter] = useState<TroubleDeckFilter>("all");
  const [starting, setStarting] = useState(false);
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);

  const { data, isLoading, isError } = useTroubleWords(deckFilter);
  const dismiss = useDismissTroubleWord();

  const items = data?.items ?? [];

  function wordIdsForStudy(deck: SrsDeckType): number[] {
    if (deckFilter === deck) {
      return items.map((w) => w.wordId);
    }
    if (deckFilter === "all") {
      return items
        .filter((w) => w.decks.some((d) => d.deckType === deck))
        .map((w) => w.wordId);
    }
    return [];
  }

  async function startStudy(deck: SrsDeckType) {
    const wordIds = wordIdsForStudy(deck);
    if (wordIds.length === 0) {
      alert(t("troubleWords.noCardsForDeck"));
      return;
    }

    setStarting(true);
    setDeckPickerOpen(false);
    try {
      const queueItems = await fetchTroubleSrsQueue(deck, wordIds);
      if (queueItems.length === 0) {
        alert(t("troubleWords.noCardsForDeck"));
        return;
      }
      const label = srsDeckLabel(t, deck);
      startSrsSession(
        deck,
        queueItems,
        t("troubleWords.sessionTitle", { label: label.title }),
        "/srs/trouble",
        { jlptMin: null, jlptMax: null, sort: "due-asc" },
      );
      navigate("/srs/study");
    } finally {
      setStarting(false);
    }
  }

  function handleStudyClick() {
    if (items.length === 0) return;
    if (deckFilter !== "all") {
      startStudy(deckFilter);
      return;
    }
    setDeckPickerOpen(true);
  }

  function handleDismiss(wordId: number) {
    dismiss.mutate({ wordId });
  }

  return (
    <div className="min-h-dvh max-w-2xl mx-auto bg-app-bg flex flex-col sm:border-l sm:border-r sm:border-app-border">
      <div className="bg-app-surface border-b border-app-border px-5 pt-4 pb-4 shrink-0">
        <button
          onClick={() => navigate("/srs")}
          className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted hover:text-app-text-secondary transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-[11px] font-semibold text-main-500 dark:text-main-600 uppercase tracking-widest">
            {t("nav.srs")}
          </span>
        </button>
        <h1 className="text-xl font-bold text-app-text mt-2">
          {t("troubleWords.title")}
        </h1>
        <p className="text-sm text-app-text-secondary mt-1">{t("troubleWords.subtitle")}</p>
      </div>

      <div className="px-4 py-3 flex gap-2 overflow-x-auto shrink-0 scrollbar-none">
        {DECK_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setDeckFilter(filter)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              deckFilter === filter
                ? "bg-main-500 text-white"
                : "bg-app-surface text-app-text-secondary border border-app-border-strong"
            }`}
          >
            {deckFilterLabel(t, filter)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {isLoading ? (
          <LoadingPlaceholder />
        ) : isError ? (
          <p className="text-center text-sm text-red-500 py-16">
            {t("troubleWords.loadFailed")}
          </p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <p className="text-4xl text-app-border-strong mb-3">✓</p>
            <p className="text-app-text-secondary text-sm">{t("troubleWords.empty")}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-app-border overflow-hidden mx-3">
            {items.map((item) => (
              <TroubleWordRow
                key={item.wordId}
                item={item}
                deckFilter={deckFilter}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pointer-events-none max-w-2xl mx-auto">
        <button
          type="button"
          disabled={items.length === 0 || starting}
          onClick={handleStudyClick}
          className="pointer-events-auto w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-main-500 text-white font-bold text-base shadow-lg disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {starting ? (
            <LoadingSpinner size={20} className="text-white" />
          ) : (
            <>
              <Dices size={20} />
              {t("troubleWords.study")}
            </>
          )}
        </button>
      </div>

      {deckPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
          onClick={() => setDeckPickerOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-app-surface rounded-t-2xl p-4 pb-8 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-app-text mb-3">
              {t("troubleWords.pickDeck")}
            </p>
            {(["word", "pronunciation", "meaning", "example"] as SrsDeckType[]).map(
              (deck) => {
                const count = wordIdsForStudy(deck).length;
                const label = srsDeckLabel(t, deck);
                return (
                  <button
                    key={deck}
                    type="button"
                    disabled={count === 0 || starting}
                    onClick={() => startStudy(deck)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-app-border disabled:opacity-40 active:bg-app-muted"
                  >
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-app-text">
                        {label.title}
                      </p>
                      <p className="text-xs text-app-text-muted">
                        {t("troubleWords.deckWordCount", { count })}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-app-text-muted" />
                  </button>
                );
              },
            )}
          </div>
        </div>
      )}
    </div>
  );
}
