import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Dices,
  Pencil,
} from "lucide-react";
import { WordFormModal } from "../components/WordFormModal";
import {
  RelatedWordsList,
  RelatedWordsButton,
} from "../components/RelatedWordsList";
import { KanjiDrawPad } from "../components/KanjiDrawPad";
import { useLocation } from "wouter";
import { getSrsSession } from "../store/srsStore";
import { reviewSrsCard } from "../hooks/useSrs";
import type { SrsQueueItem, ReviewRating } from "../types/srs";
import type { Word, WordUpdate } from "../types";
import { themeVars } from "../theme";
import { useWords } from "../hooks/useWords";
import { useTranslation } from "../i18n/I18nProvider";
import { intervalCountsAsDailyLearn, localDateKey } from "../lib/dailyGoal";
import { useStudyActivity } from "../hooks/useStudyActivity";
import { extractKanjiChars } from "../lib/japaneseScript";

function queueWordToWord(item: SrsQueueItem): Word {
  return {
    ...item.word,
    srsExamples: item.word.srsExamples ?? [],
    relatedWordIds: item.word.relatedWordIds ?? [],
  } as Word;
}

export function DrawingSrsStudyPage() {
  const { t, formatStudyDate } = useTranslation();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const sessionRef = useRef(getSrsSession());
  const { title, backPath } = sessionRef.current;
  const { words, updateWord } = useWords();
  const { increment: recordStudy } = useStudyActivity();

  const [items, setItems] = useState(() =>
    sessionRef.current.items.filter(
      (item) => extractKanjiChars(item.word.kanji).length > 0,
    ),
  );
  const [index, setIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [charIndex, setCharIndex] = useState(0);
  const [filled, setFilled] = useState<boolean[]>([]);

  const headerRef = useRef<HTMLDivElement>(null);
  const ratingBarRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  const [ratingBarHeight, setRatingBarHeight] = useState(72);
  const reviewingRef = useRef(false);
  const indexRef = useRef(index);
  const itemsRef = useRef(items);
  indexRef.current = index;
  itemsRef.current = items;

  useEffect(() => {
    if (items.length === 0) setDone(true);
  }, [items.length]);

  useEffect(() => {
    const item = items[index];
    if (!item) return;
    const chars = extractKanjiChars(item.word.kanji);
    setCharIndex(0);
    setFilled(chars.map(() => false));
    setShowRelated(false);
  }, [index, items]);

  useEffect(() => {
    const header = headerRef.current;
    const bar = ratingBarRef.current;
    const update = () => {
      if (header) setHeaderHeight(header.getBoundingClientRect().height);
      if (bar) setRatingBarHeight(bar.getBoundingClientRect().height);
    };
    update();
    const ro = new ResizeObserver(update);
    if (header) ro.observe(header);
    if (bar) ro.observe(bar);
    return () => ro.disconnect();
  }, [done]);

  const advanceAfterReview = useCallback(() => {
    const next = indexRef.current + 1;
    if (next >= itemsRef.current.length) {
      setDone(true);
    } else {
      setIndex(next);
    }
    setShowDetails(false);
    setShowRelated(false);
  }, []);

  const advanceRequeue = useCallback(() => {
    const current = itemsRef.current[indexRef.current];
    if (!current) return;
    setItems((prev) => [
      ...prev.slice(0, indexRef.current),
      ...prev.slice(indexRef.current + 1),
      current,
    ]);
    setShowDetails(false);
    setShowRelated(false);
  }, []);

  const submitReview = useCallback(
    async (rating: ReviewRating) => {
      if (reviewingRef.current) return;
      const current = itemsRef.current[indexRef.current];
      if (!current) return;

      reviewingRef.current = true;
      setReviewing(true);
      try {
        await reviewSrsCard(current.card.id, rating, localDateKey());
        const ratingMeta =
          rating === 1
            ? "again"
            : rating === 2
              ? "hard"
              : rating === 3
                ? "good"
                : "easy";
        const intervalLabel = current.card.intervals[ratingMeta];
        if (intervalCountsAsDailyLearn(intervalLabel)) {
          recordStudy.mutate({ deck: "drawing", date: localDateKey() });
        }
        queryClient.invalidateQueries({ queryKey: ["trouble-words"] });
        if (rating === 1) {
          advanceRequeue();
        } else {
          advanceAfterReview();
        }
      } catch {
        alert(t("srs.study.saveFailed"));
      } finally {
        reviewingRef.current = false;
        setReviewing(false);
      }
    },
    [advanceAfterReview, advanceRequeue, queryClient, recordStudy, t],
  );

  function handleCharMatched() {
    setFilled((prev) => {
      const next = [...prev];
      next[charIndex] = true;
      const allDone = next.every(Boolean);
      if (allDone) {
        queueMicrotask(() => submitReview(3));
      } else if (charIndex < next.length - 1) {
        // stay on current until user taps next arrow
      }
      return next;
    });
  }

  function goNextChar() {
    if (!filled[charIndex]) return;
    setCharIndex((i) => Math.min(i + 1, filled.length - 1));
  }

  function goPrevChar() {
    setCharIndex((i) => Math.max(i - 1, 0));
  }

  function handleRestart() {
    const fresh = sessionRef.current.items.filter(
      (item) => extractKanjiChars(item.word.kanji).length > 0,
    );
    setItems([...fresh].sort(() => Math.random() - 0.5));
    setIndex(0);
    setDone(false);
    setShowDetails(false);
  }

  function handleSave(
    data: WordUpdate & {
      relatedWordIds: number[];
      categoryIds: number[];
    },
  ) {
    const current = items[index];
    if (current) {
      updateWord(current.word.id, data);
      setItems((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                word: {
                  ...item.word,
                  ...data,
                  relatedWordIds: data.relatedWordIds,
                  categoryIds: data.categoryIds,
                },
              }
            : item,
        ),
      );
    }
    setShowEdit(false);
  }

  const item = items[index];

  if (!item && !done) {
    return (
      <div className="bg-app-surface sm:border-app-border mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center sm:box-content sm:border-r-2 sm:border-l-2">
        <p className="text-app-text-muted">{t("srs.study.draw.noKanji")}</p>
        <button
          onClick={() => navigate(backPath)}
          className="text-main-400 mt-4 text-sm"
        >
          {t("common.goBack")}
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-app-surface sm:border-app-border mx-auto flex min-h-dvh max-w-2xl flex-col sm:box-content sm:border-r-2 sm:border-l-2">
        <div className="bg-app-surface border-app-border sticky top-0 z-20 flex items-center border-b px-5 pt-4 pb-4">
          <button
            onClick={() => navigate(backPath)}
            className="text-app-text-muted -ml-1 flex items-center gap-1.5 p-1"
          >
            <ArrowLeft size={18} />
            <span className="text-main-400 dark:text-main-500 text-[11px] font-semibold tracking-widest uppercase">
              {title}
            </span>
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-3xl"
            style={{ background: themeVars.star }}
          >
            ★
          </div>
          <div>
            <p className="text-app-text mb-1 text-2xl font-bold">
              {t("common.completed")}
            </p>
            <p className="text-app-text-muted text-sm">
              {t("srs.study.sessionComplete")}
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <button
              onClick={handleRestart}
              className="text-app-text-secondary flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold"
              style={{ background: themeVars.level(1) }}
            >
              <Dices size={16} strokeWidth={2} />
              {t("srs.study.restart")}
            </button>
            <button
              onClick={() => navigate(backPath)}
              className="border-app-border-strong text-app-text-secondary w-full rounded-2xl border py-3 text-sm font-semibold"
            >
              {t("srs.study.backToDecks")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { word } = item!;
  const liveWord = words.find((w) => w.id === word.id) ?? queueWordToWord(item!);
  const kanjiChars = extractKanjiChars(word.kanji);
  const currentChar = kanjiChars[charIndex] ?? "";
  const canGoNext = !!filled[charIndex] && charIndex < kanjiChars.length - 1;
  const sheetMaxHeight = `calc(100dvh - ${headerHeight}px - ${ratingBarHeight}px)`;

  return (
    <div className="bg-app-surface sm:border-app-border mx-auto flex min-h-dvh max-w-2xl flex-col select-none sm:box-content sm:border-r-2 sm:border-l-2">
      <div
        ref={headerRef}
        className="bg-app-surface border-app-border sticky top-0 z-20 flex shrink-0 items-center justify-between border-b px-5 pt-4 pb-4"
      >
        <button
          onClick={() => navigate(backPath)}
          className="text-app-text-muted -ml-1 flex items-center gap-1.5 p-1"
        >
          <ArrowLeft size={18} />
          <span className="text-main-400 dark:text-main-500 text-[11px] font-semibold tracking-widest uppercase">
            {title}
          </span>
        </button>
        <span className="text-app-text-muted text-sm font-medium tabular-nums">
          {t("common.cardProgress", {
            current: index + 1,
            total: items.length,
          })}
        </span>
      </div>

      <div
        className="relative flex-1 overflow-hidden"
        style={{ paddingBottom: ratingBarHeight }}
        onClick={() => {
          if (!showDetails) setShowDetails(true);
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center px-8">
          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            <p className="text-app-text text-center text-2xl leading-snug font-semibold">
              {word.pronunciation || t("common.emDash")}
            </p>
            <p className="text-app-text-secondary text-center text-base leading-snug">
              {word.meaning || t("common.emDash")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {word.date && (
                <span className="bg-app-muted text-app-text-secondary rounded-full px-2.5 py-1 text-xs font-medium">
                  {formatStudyDate(word.date)}
                </span>
              )}
              {word.jlptLevel && (
                <span className="bg-app-muted text-app-text-secondary rounded-full px-2.5 py-1 text-xs font-semibold">
                  {word.jlptLevel}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className="bg-app-surface border-app-border pointer-events-auto fixed right-0 left-0 z-20 mx-auto flex max-w-2xl flex-col rounded-t-2xl border-t shadow-xl sm:border-r sm:border-l"
        style={{
          bottom: ratingBarHeight,
          transform: showDetails ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          maxHeight: sheetMaxHeight,
          height: showDetails ? sheetMaxHeight : undefined,
          overflow: "hidden",
          pointerEvents: showDetails ? "auto" : "none",
        }}
      >
        <div
          className="flex cursor-pointer justify-center pt-3 pb-1"
          onClick={() => setShowDetails(false)}
          role="button"
          aria-label={t("common.close")}
        >
          <div className="bg-app-border-strong h-1 w-10 rounded-full" />
        </div>
        <div
          className={`relative flex min-h-0 flex-1 flex-col px-6 pt-2 pb-4 ${showRelated && liveWord.meaning ? "" : "pr-24"}`}
        >
          <div className="absolute top-2 right-6 flex flex-row items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="bg-app-muted text-app-text-secondary flex h-8 w-10 items-center justify-center rounded-lg px-3 py-1.5"
            >
              <Pencil size={13} />
            </button>
            {liveWord.meaning && (
              <RelatedWordsButton
                slideUp
                active={showRelated}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRelated((v) => !v);
                }}
              />
            )}
          </div>

          {showRelated && liveWord.meaning ? (
            <div className="mt-10">
              <RelatedWordsList word={liveWord} allWords={words} />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <KanjiDrawPad
                expected={currentChar}
                onMatch={handleCharMatched}
                alreadyMatched={!!filled[charIndex]}
                resetKey={`${word.id}-${charIndex}`}
                clearLabel={t("srs.study.draw.clear")}
                undoLabel={t("srs.study.draw.undo")}
                gridLabel={t("srs.study.draw.grid")}
                fuzzyLabel={t("srs.study.draw.fuzzy")}
                offby1Label={t("srs.study.draw.offby1")}
                className="min-h-0 flex-1"
              />

              <div className="flex shrink-0 items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={goPrevChar}
                  disabled={charIndex === 0}
                  className="text-app-text-secondary flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30"
                >
                  <ChevronLeft size={22} />
                </button>
                <div className="flex items-center gap-2">
                  {kanjiChars.map((_, i) => (
                    <div
                      key={i}
                      className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${
                        filled[i]
                          ? "border-main-500 bg-main-500"
                          : i === charIndex
                            ? "border-main-400 bg-transparent"
                            : "border-app-border-strong bg-transparent"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={goNextChar}
                  disabled={!canGoNext}
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    canGoNext
                      ? "text-app-text-secondary"
                      : "text-app-border-strong"
                  }`}
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        ref={ratingBarRef}
        className="bg-app-surface border-app-border fixed right-0 bottom-0 left-0 z-30 mx-auto max-w-2xl border-t px-3 py-3 sm:border-r sm:border-l"
      >
        <button
          type="button"
          onClick={() => submitReview(1)}
          disabled={reviewing}
          className="bg-app-muted text-app-text-secondary hover:bg-red-600 hover:text-red-100 w-full rounded-xl py-2.5 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          {t("srs.study.ratings.again")}
        </button>
      </div>

      {showEdit && (
        <WordFormModal
          initial={liveWord}
          allWords={words}
          onSave={handleSave}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
