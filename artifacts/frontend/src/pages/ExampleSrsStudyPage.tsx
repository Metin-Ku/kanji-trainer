import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Dices, Eye, Pencil } from "lucide-react";
import { SrsWordSlideUp } from "../components/SrsWordSlideUp";
import { ExampleSentenceDisplay } from "../components/ExampleSentenceDisplay";
import { useLocation } from "wouter";
import { getSrsSession } from "../store/srsStore";
import { reviewSrsExample } from "../hooks/useSrs";
import type { SrsQueueItem } from "../types/srs";
import type { Word, WordUpdate } from "../types";
import { themeVars } from "../theme";
import { useWords } from "../hooks/useWords";
import { getAppSettings } from "../settings/appSettings";
import { romajiToKanaInput } from "../lib/japaneseInput";
import { gradeClozeAnswer, renderHintParts } from "../lib/srsExamples";
import { linkedTokensForDisplay } from "../lib/wordLinking";
import { useTranslation } from "../i18n/I18nProvider";
import { localDateKey } from "../lib/dailyGoal";
import { useStudyActivity } from "../hooks/useStudyActivity";
import { useStudySwipeKeys } from "../lib/studyKeyboard";
import {
  consumeWarmedKeyboard,
} from "../lib/mobileKeyboard";

type AnswerPhase = "typing" | "correct" | "partial" | "revealed";

function queueWordToWord(item: SrsQueueItem): Word {
  return {
    ...item.word,
    srsExamples: item.word.srsExamples ?? [],
    relatedWordIds: item.word.relatedWordIds ?? [],
  } as Word;
}

export function ExampleSrsStudyPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const sessionRef = useRef(getSrsSession());
  const { title, backPath } = sessionRef.current;
  const { words, updateWord } = useWords();
  const settings = getAppSettings();
  const { increment: recordStudy } = useStudyActivity();

  const [items, setItems] = useState(sessionRef.current.items);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [answer, setAnswer] = useState("");
  const [answerPhase, setAnswerPhase] = useState<AnswerPhase>("typing");
  const [emptyChecked, setEmptyChecked] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [sheetWord, setSheetWord] = useState<Word | null>(null);
  const [focused, setFocused] = useState(false);

  const reviewingRef = useRef(false);
  const indexRef = useRef(index);
  const itemsRef = useRef(items);
  const answerInputRef = useRef<HTMLInputElement>(null);
  const answerControlsRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportListenCleanupRef = useRef<(() => void) | null>(null);
  indexRef.current = index;
  itemsRef.current = items;

  /** Pin input+button so the button's bottom sits just above the keyboard. */
  const alignControlsAboveKeyboard = useCallback(() => {
    const controls = answerControlsRef.current;
    const scrollArea = scrollAreaRef.current;
    const vv = window.visualViewport;
    if (!controls || !scrollArea) return;

    const gap = 12;
    const keyboardInset = vv
      ? Math.max(0, window.innerHeight - (vv.height + vv.offsetTop))
      : 0;

    // Leave room below the controls so we can scroll them above the keyboard.
    const pad = Math.max(32, keyboardInset + gap);
    if (scrollArea.style.paddingBottom !== `${pad}px`) {
      scrollArea.style.paddingBottom = `${pad}px`;
    }

    const rect = controls.getBoundingClientRect();
    const visibleBottom = vv
      ? vv.offsetTop + vv.height
      : window.innerHeight;
    const overflow = rect.bottom - visibleBottom + gap;
    if (Math.abs(overflow) < 2) return;

    scrollArea.scrollTop += overflow;
  }, []);

  const stopViewportListen = useCallback(() => {
    viewportListenCleanupRef.current?.();
    viewportListenCleanupRef.current = null;
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) scrollArea.style.paddingBottom = "";
  }, []);

  const startViewportListen = useCallback(() => {
    stopViewportListen();
    const vv = window.visualViewport;

    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let settleTimer2: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      clearTimeout(settleTimer);
      clearTimeout(settleTimer2);
      requestAnimationFrame(alignControlsAboveKeyboard);
      settleTimer = setTimeout(alignControlsAboveKeyboard, 80);
      settleTimer2 = setTimeout(alignControlsAboveKeyboard, 220);
    };

    if (vv) {
      vv.addEventListener("resize", onChange);
      vv.addEventListener("scroll", onChange);
    }
    window.addEventListener("resize", onChange);
    onChange();

    viewportListenCleanupRef.current = () => {
      clearTimeout(settleTimer);
      clearTimeout(settleTimer2);
      vv?.removeEventListener("resize", onChange);
      vv?.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, [alignControlsAboveKeyboard, stopViewportListen]);

  /**
   * Focus must stay in a user-gesture chain when possible.
   * After deck start we steal focus from the warmed ghost input so the keyboard stays open.
   */
  const focusAnswerInput = useCallback(() => {
    const el = answerInputRef.current;
    if (!el) return false;

    const ok = consumeWarmedKeyboard(el);
    if (!ok) {
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
    }
    startViewportListen();
    return document.activeElement === el;
  }, [startViewportListen]);

  useEffect(() => {
    return () => stopViewportListen();
  }, [stopViewportListen]);

  useEffect(() => {
    const html = document.documentElement;
    const previousFontSize = html.style.fontSize;

    html.style.fontSize = "12px";

    return () => {
      html.style.fontSize = previousFontSize;
    };
  }, []);

  useEffect(() => {
    setAnswer("");
    setAnswerPhase("typing");
    setEmptyChecked(false);
    setSheetWord(null);
    setShowCardDetails(false);

    // Focus as soon as the new card's input is in the DOM (sync as possible).
    // Delayed focus breaks the user-gesture chain and blocks the mobile keyboard.
    let cancelled = false;
    const tryFocus = () => {
      if (cancelled) return;
      if (!focusAnswerInput()) {
        requestAnimationFrame(tryFocus);
      }
    };
    requestAnimationFrame(tryFocus);

    return () => {
      cancelled = true;
    };
  }, [index, focusAnswerInput]);

  const advanceAfterReview = useCallback(() => {
    const nextIndex = indexRef.current + 1;
    if (nextIndex >= itemsRef.current.length) {
      setDone(true);
    } else {
      setIndex(nextIndex);
    }
  }, []);

  async function submitReview(correct: boolean) {
    const current = itemsRef.current[indexRef.current];
    if (!current || reviewingRef.current) return;

    reviewingRef.current = true;
    setReviewing(true);
    try {
      await reviewSrsExample(current.card.id, correct);
      if (correct)
        recordStudy.mutate({ deck: "example", date: localDateKey() });
      queryClient.invalidateQueries({ queryKey: ["trouble-words"] });
    } catch {
      alert(t("srs.study.saveFailed"));
      throw new Error("review failed");
    } finally {
      reviewingRef.current = false;
      setReviewing(false);
    }
  }

  async function handlePrimaryAction() {
    if (reviewingRef.current) return;
    const current = itemsRef.current[indexRef.current];
    if (!current) return;

    const liveWord =
      words.find((w) => w.id === current.word.id) ?? queueWordToWord(current);
    const examples = liveWord.srsExamples ?? [];
    const cursor = current.card.exampleCursor ?? 0;
    const ex = examples[cursor];
    if (!ex) return;

    if (answerPhase === "correct") {
      try {
        await submitReview(true);
        advanceAfterReview();
      } catch {
        /* keep feedback visible */
        focusAnswerInput();
      }
      return;
    }

    if (answerPhase === "partial" || answerPhase === "revealed") {
      try {
        await submitReview(false);
        advanceAfterReview();
      } catch {
        /* keep feedback visible */
        focusAnswerInput();
      }
      return;
    }

    if (!answer.trim()) {
      if (!emptyChecked) {
        setEmptyChecked(true);
        focusAnswerInput();
        return;
      }
      setAnswerPhase("revealed");
      focusAnswerInput();
      return;
    }

    setEmptyChecked(false);
    const correct = gradeClozeAnswer(
      answer,
      ex.hiddenWord,
      liveWord.pronunciation,
      liveWord.kanji,
      ex.hiddenReading,
      ex.hiddenScript,
    );
    setAnswerPhase(correct ? "correct" : "partial");
    focusAnswerInput();
  }

  const handlePrimaryActionRef = useRef(handlePrimaryAction);
  handlePrimaryActionRef.current = handlePrimaryAction;

  const handleDontKnow = useCallback(async () => {
    if (reviewingRef.current || done) return;
    if (answerPhase === "typing") {
      setEmptyChecked(false);
      setAnswerPhase("revealed");
      focusAnswerInput();
      return;
    }
    if (answerPhase === "partial" || answerPhase === "revealed") {
      try {
        await submitReview(false);
        advanceAfterReview();
      } catch {
        /* keep feedback visible */
        focusAnswerInput();
      }
    }
  }, [advanceAfterReview, answerPhase, done, focusAnswerInput]);

  useStudySwipeKeys({
    enabled: !done && !!items[index] && !sheetWord && !showCardDetails,
    onKnow: () => handlePrimaryActionRef.current(),
    onDontKnow: handleDontKnow,
  });

  function handleAnswerChange(raw: string) {
    const current = itemsRef.current[indexRef.current];
    const liveWord = current
      ? (words.find((w) => w.id === current.word.id) ??
        queueWordToWord(current))
      : null;
    const examples = liveWord?.srsExamples ?? [];
    const cursor = current?.card.exampleCursor ?? 0;
    const ex = examples[cursor];
    const script = ex?.hiddenScript ?? "kanji";

    setAnswer(settings.srsRomajiInput ? romajiToKanaInput(raw, script) : raw);
    if (answerPhase !== "typing") {
      setAnswerPhase("typing");
    }
    setEmptyChecked(false);
  }

  function handleRestart() {
    setItems([...sessionRef.current.items].sort(() => Math.random() - 0.5));
    setIndex(0);
    setDone(false);
    setAnswer("");
    setAnswerPhase("typing");
    setEmptyChecked(false);
  }

  function handleSaveWord(
    wordId: number,
    data: WordUpdate & { relatedWordIds: number[]; categoryIds: number[] },
  ) {
    updateWord(wordId, data);
    setItems((prev) =>
      prev.map((item) =>
        item.word.id === wordId
          ? {
              ...item,
              word: {
                ...item.word,
                ...data,
                srsExamples: data.srsExamples ?? item.word.srsExamples,
                relatedWordIds: data.relatedWordIds,
                categoryIds: data.categoryIds,
              },
            }
          : item,
      ),
    );
  }

  function handleSaveCard(
    data: WordUpdate & {
      relatedWordIds: number[];
      categoryIds: number[];
    },
  ) {
    const current = items[index];
    if (current) handleSaveWord(current.word.id, data);
    setShowCardDetails(false);
  }

  function handleSaveSheet(
    data: WordUpdate & {
      relatedWordIds: number[];
      categoryIds: number[];
    },
  ) {
    if (sheetWord) handleSaveWord(sheetWord.id, data);
    setSheetWord(null);
  }

  const item = items[index];

  if (!item && !done) {
    return (
      <div className="min-h-dvh max-w-2xl mx-auto flex flex-col items-center justify-center bg-app-surface">
        <p className="text-app-text-muted">{t("srs.study.cardNotFound")}</p>
        <button
          onClick={() => navigate(backPath)}
          className="mt-4 text-main-400 text-sm"
        >
          {t("common.goBack")}
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-dvh max-w-2xl mx-auto flex flex-col bg-app-surface sm:box-content sm:border-l-2 sm:border-r-2 sm:border-app-border">
        <div className="sticky top-0 z-20 bg-app-surface border-b border-app-border px-5 pt-4 pb-4">
          <button
            onClick={() => navigate(backPath)}
            className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted"
          >
            <ArrowLeft size={18} />
            <span className="text-[11px] font-semibold text-main-500 dark:text-main-600 uppercase tracking-widest">
              {title}
            </span>
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ background: themeVars.star }}
          >
            ★
          </div>
          <div>
            <p className="text-2xl font-bold text-app-text mb-1">
              {t("common.completed")}
            </p>
            <p className="text-sm text-app-text-muted">
              {t("srs.study.examplesComplete")}
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={handleRestart}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-app-text-secondary text-sm"
              style={{ background: themeVars.level(1) }}
            >
              <Dices size={16} /> {t("srs.study.restart")}
            </button>
            <button
              onClick={() => navigate(backPath)}
              className="w-full py-3 rounded-2xl font-semibold text-sm border border-app-border-strong text-app-text-secondary"
            >
              {t("srs.study.backToDecks")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const liveWord =
    words.find((w) => w.id === item.word.id) ?? queueWordToWord(item);
  const examples = liveWord.srsExamples ?? [];
  const cursor = item.card.exampleCursor ?? 0;
  const currentEx = examples[cursor] ?? examples[0];
  const hasWordLinks =
    (currentEx ? (linkedTokensForDisplay(currentEx)?.length ?? 0) : 0) > 0;

  const answerState: AnswerPhase = answerPhase;

  return (
    <div className="min-h-[max(25rem,50vh)] max-w-2xl mx-auto bg-app-surface flex flex-col sm:box-content sm:border-l-2 sm:border-r-2 sm:border-app-border">
      <div className="sticky top-0 z-20 bg-app-surface border-b border-app-border px-5 pt-4 pb-4 flex items-center justify-between shrink-0">
        <button
          onClick={() => navigate(backPath)}
          className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted"
        >
          <ArrowLeft size={18} />
          <span className="text-[11px] font-semibold text-main-500 dark:text-main-600 uppercase tracking-widest">
            {title}
          </span>
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCardDetails(true)}
            className="p-2 rounded-lg bg-app-muted text-app-text-secondary"
          >
            <Eye size={14} />
          </button>
          <span className="text-sm text-app-text-muted font-medium tabular-nums">
            {t("common.cardProgress", {
              current: index + 1,
              total: items.length,
            })}
          </span>
        </div>
      </div>

      <div
        ref={scrollAreaRef}
        className="flex-1 flex flex-col px-6 py-6 gap-6 overflow-y-auto pb-8"
      >
        {currentEx ? (
          <>
            <div className="rounded-2xl bg-app-muted border border-app-border px-5 py-6 text-center">
              <ExampleSentenceDisplay
                example={currentEx}
                headwordKanji={liveWord.kanji}
                words={words}
                wordLinksEnabled={
                  settings.srsSentenceWordLinks &&
                  hasWordLinks &&
                  answerPhase === "typing"
                }
                liveAnswer={answer}
                answerState={answerState}
                onWordTap={setSheetWord}
              />
              {examples.length > 1 && (
                <p className="text-xs text-app-text-muted mt-3">
                  {t("common.exampleProgress", {
                    current: (cursor % examples.length) + 1,
                    total: examples.length,
                  })}
                </p>
              )}
            </div>

            <div className="space-y-2 text-center">
              {currentEx.hints.map((hint, i) => (
                <p
                  key={i}
                  className="text-base text-app-text-secondary leading-relaxed"
                >
                  {renderHintParts(hint.text, hint.highlights).map((p, j) =>
                    p.highlight ? (
                      <span
                        key={j}
                        className="font-semibold text-main-600 bg-main-100 dark:bg-main-900 px-0.5 rounded"
                      >
                        {p.text}
                      </span>
                    ) : (
                      <span key={j}>{p.text}</span>
                    ),
                  )}
                </p>
              ))}
            </div>

            <div ref={answerControlsRef} className="space-y-3 mt-auto">
              <input
                ref={answerInputRef}
                type="text"
                inputMode="text"
                enterKeyHint="done"
                value={answer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePrimaryAction();
                }}
                onFocus={() => {
                  setFocused(true);
                  startViewportListen();
                }}
                onBlur={() => {
                  setFocused(false);
                  stopViewportListen();
                }}
                // Don't disable while reviewing — disabling dismisses the mobile keyboard.
                readOnly={reviewing}
                placeholder={settings.srsRomajiInput ? "答え" : ""}
                className={`
                  w-full rounded-xl border bg-app-muted px-4 py-3 text-xl font-bold text-center text-app-text
                  outline-none
                  transition-all duration-150
                  ${
                    focused
                      ? answerPhase === "revealed"
                        ? "border-red-600 ring-2 ring-red-600 ring-inset ring-offset-0"
                        : answerPhase === "correct"
                          ? "border-green-500 ring-2 ring-green-500 ring-inset ring-offset-0"
                          : "border-main-300 ring-2 ring-main-300 ring-inset ring-offset-0"
                      : "border-app-border-strong"
                  }
                `}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                autoFocus
              />

              <button
                type="button"
                // Keep input focused / keyboard open when tapping the button (mobile).
                onPointerDown={(e) => e.preventDefault()}
                onClick={handlePrimaryAction}
                disabled={reviewing}
                className="w-full py-3 rounded-xl font-bold bg-main-500 hover:bg-main-600 text-white disabled:opacity-50"
              >
                {answerPhase === "typing"
                  ? t("common.check")
                  : t("common.continue")}
              </button>
            </div>
          </>
        ) : (
          <p className="text-center text-app-text-muted">
            {t("srs.example.noExample")}
          </p>
        )}
      </div>

      <SrsWordSlideUp
        open={!!sheetWord}
        word={sheetWord ?? liveWord}
        allWords={words}
        onClose={() => setSheetWord(null)}
        onSave={sheetWord ? handleSaveSheet : undefined}
      />

      <SrsWordSlideUp
        open={showCardDetails}
        word={liveWord}
        allWords={words}
        onClose={() => setShowCardDetails(false)}
        onSave={handleSaveCard}
      />
    </div>
  );
}
