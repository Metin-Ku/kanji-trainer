import { useState } from "react";
import { ArrowLeft, ChevronRight, Dices, X } from "lucide-react";
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
import { warmMobileKeyboard } from "../lib/mobileKeyboard";

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
    <div className="border-app-border bg-app-surface flex items-start gap-3 border-b px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-app-text text-base leading-tight font-bold">
            {item.kanji}
          </p>
          {item.jlptLevel && (
            <span className="bg-app-muted text-app-text-secondary rounded-md px-1.5 py-0.5 text-[10px] font-semibold">
              {item.jlptLevel}
            </span>
          )}
        </div>
        {item.pronunciation && (
          <p className="text-app-text-secondary mt-0.5 text-xs">
            {item.pronunciation}
          </p>
        )}
        {item.meaning && (
          <p className="text-app-text-muted mt-0.5 truncate text-xs">
            {item.meaning}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {visibleDecks.map((d) => (
            <span
              key={d.deckType}
              className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600"
            >
              {srsDeckLabel(t, d.deckType).title}
              <span className="tabular-nums">×{d.mistakeCount}</span>
            </span>
          ))}
        </div>
        <p className="text-app-text-muted mt-1.5 text-[10px]">
          {t("troubleWords.lastMistake", {
            when: formatRelativeDate(item.lastMistakeAt, t),
          })}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.wordId)}
        className="text-app-text-muted shrink-0 rounded-lg p-2 transition-colors hover:bg-red-50 hover:text-red-500"
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

    // Keyboard warmed on pointerdown for example deck.
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
      if (deckFilter === "example") warmMobileKeyboard();
      startStudy(deckFilter);
      return;
    }
    setDeckPickerOpen(true);
  }

  function handleDismiss(wordId: number) {
    dismiss.mutate({ wordId });
  }

  return (
    <div className="bg-app-bg sm:border-app-border mx-auto flex min-h-dvh max-w-2xl flex-col sm:box-content sm:border-r-2 sm:border-l-2">
      <div className="bg-app-surface border-app-border shrink-0 border-b px-5 pt-4 pb-4">
        <button
          onClick={() => navigate("/srs")}
          className="text-app-text-muted hover:text-app-text-secondary -ml-1 flex items-center gap-1.5 p-1 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-main-400 dark:text-main-500 text-[11px] font-semibold tracking-widest uppercase">
            {t("nav.srs")}
          </span>
        </button>
        <h1 className="text-app-text mt-2 text-xl font-bold">
          {t("troubleWords.title")}
        </h1>
        <p className="text-app-text-secondary mt-1 text-sm">
          {t("troubleWords.subtitle")}
        </p>
      </div>

      <div className="flex shrink-0 scrollbar-none gap-2 overflow-x-auto px-4 py-3">
        {DECK_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setDeckFilter(filter)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              deckFilter === filter
                ? "bg-main-500 text-white"
                : "bg-app-surface text-app-text-secondary border-app-border-strong border"
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
          <p className="py-16 text-center text-sm text-red-500">
            {t("troubleWords.loadFailed")}
          </p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
            <p className="text-app-border-strong mb-3 text-4xl">✓</p>
            <p className="text-app-text-secondary text-sm">
              {t("troubleWords.empty")}
            </p>
          </div>
        ) : (
          <div className="border-app-border mx-3 overflow-hidden rounded-2xl border">
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

      <div className="pointer-events-none fixed right-0 bottom-0 left-0 mx-auto max-w-2xl bg-gradient-to-t from-gray-50 via-gray-50 to-transparent p-3.5">
        <button
          type="button"
          disabled={items.length === 0 || starting}
          onPointerDown={() => {
            if (deckFilter === "example") warmMobileKeyboard();
          }}
          onClick={handleStudyClick}
          className="bg-main-500 pointer-events-auto flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50"
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
            className="bg-app-surface w-full max-w-2xl space-y-2 rounded-t-2xl p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-app-text mb-3 text-sm font-semibold">
              {t("troubleWords.pickDeck")}
            </p>
            {(
              ["word", "pronunciation", "meaning", "example"] as SrsDeckType[]
            ).map((deck) => {
              const count = wordIdsForStudy(deck).length;
              const label = srsDeckLabel(t, deck);
              return (
                <button
                  key={deck}
                  type="button"
                  disabled={count === 0 || starting}
                  onPointerDown={() => {
                    if (deck === "example") warmMobileKeyboard();
                  }}
                  onClick={() => startStudy(deck)}
                  className="border-app-border active:bg-app-muted flex w-full items-center gap-3 rounded-xl border px-4 py-3 disabled:opacity-40"
                >
                  <div className="flex-1 text-left">
                    <p className="text-app-text text-sm font-bold">
                      {label.title}
                    </p>
                    <p className="text-app-text-muted text-xs">
                      {t("troubleWords.deckWordCount", { count })}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-app-text-muted" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
