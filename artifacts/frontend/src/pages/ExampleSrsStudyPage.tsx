import {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
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
import { consumeWarmedKeyboard } from "../lib/mobileKeyboard";

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
    const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
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
   * Steal warmed keyboard focus, or keep existing focus.
   * Programmatic focus alone will NOT open the keyboard on iOS — we rely on
   * warmMobileKeyboard() from the deck tap, then never letting focus escape.
   */
  const focusAnswerInput = useCallback(() => {
    const el = answerInputRef.current;
    if (!el) return false;

    // Already editing — just ensure caret; don't disturb the keyboard.
    if (document.activeElement === el) {
      try {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      } catch {
        /* ignore */
      }
      startViewportListen();
      return true;
    }

    const ok = consumeWarmedKeyboard(el);
    startViewportListen();
    return ok || document.activeElement === el;
  }, [startViewportListen]);

  useEffect(() => {
    return () => stopViewportListen();
  }, [stopViewportListen]);

  // useEffect(() => {
  //   const html = document.documentElement;
  //   const previousFontSize = html.style.fontSize;

  //   html.style.fontSize = "12.8px";

  //   return () => {
  //     html.style.fontSize = previousFontSize;
  //   };
  // }, []);

  // Keep answer input at ≥16px computed size so iOS shows keyboard/caret
  // (page root sets html font-size to 12px, which would make rem-based text < 16px).

  useEffect(() => {
    setAnswer("");
    setAnswerPhase("typing");
    setEmptyChecked(false);
    setSheetWord(null);
    setShowCardDetails(false);
  }, [index]);

  useLayoutEffect(() => {
    // Steal warmed keyboard before paint; if already focused, keep caret.
    focusAnswerInput();
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
      <div className="bg-app-surface mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center">
        <p className="text-app-text-muted">{t("srs.study.cardNotFound")}</p>
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
        <div className="bg-app-surface border-app-border sticky top-0 z-20 border-b px-5 pt-4 pb-4">
          <button
            onClick={() => navigate(backPath)}
            className="text-app-text-muted -ml-1 flex items-center gap-1.5 p-1"
          >
            <ArrowLeft size={18} />
            <span className="text-main-500 dark:text-main-600 text-[11px] font-semibold tracking-widest uppercase">
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
              {t("srs.study.examplesComplete")}
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <button
              onClick={handleRestart}
              className="text-app-text-secondary flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold"
              style={{ background: themeVars.level(1) }}
            >
              <Dices size={16} /> {t("srs.study.restart")}
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

  const liveWord =
    words.find((w) => w.id === item.word.id) ?? queueWordToWord(item);
  const examples = liveWord.srsExamples ?? [];
  const cursor = item.card.exampleCursor ?? 0;
  const currentEx = examples[cursor] ?? examples[0];
  const hasWordLinks =
    (currentEx ? (linkedTokensForDisplay(currentEx)?.length ?? 0) : 0) > 0;

  const answerState: AnswerPhase = answerPhase;

  return (
    // <div className="min-h-[max(25rem,50vh)] max-w-2xl mx-auto bg-app-surface flex flex-col sm:box-content sm:border-l-2 sm:border-r-2 sm:border-app-border">
    <div className="bg-app-surface sm:border-app-border mx-auto flex min-h-dvh max-w-2xl flex-col sm:box-content sm:border-r-2 sm:border-l-2">
      <div className="bg-app-surface border-app-border sticky top-0 z-20 flex shrink-0 items-center justify-between border-b px-5 pt-4 pb-4">
        <button
          onClick={() => navigate(backPath)}
          className="text-app-text-muted -ml-1 flex items-center gap-1.5 p-1"
        >
          <ArrowLeft size={18} />
          <span className="text-main-500 dark:text-main-600 text-[11px] font-semibold tracking-widest uppercase">
            {title}
          </span>
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCardDetails(true)}
            className="bg-app-muted text-app-text-secondary rounded-lg p-2"
          >
            <Eye size={14} />
          </button>
          <span className="text-app-text-muted text-sm font-medium tabular-nums">
            {t("common.cardProgress", {
              current: index + 1,
              total: items.length,
            })}
          </span>
        </div>
      </div>

      <div
        ref={scrollAreaRef}
        className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6 pb-8"
      >
        {currentEx ? (
          <>
            <div className="bg-app-muted border-app-border rounded-2xl border px-5 py-6 text-center">
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
                <p className="text-app-text-muted mt-3 text-xs">
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
                  className="text-app-text-secondary text-base leading-relaxed"
                >
                  {renderHintParts(hint.text, hint.highlights).map((p, j) =>
                    p.highlight ? (
                      <span
                        key={j}
                        className="text-main-600 bg-main-100 dark:bg-main-900 rounded px-0.5 font-semibold"
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

            <div ref={answerControlsRef} className="relative mt-auto space-y-3">
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
                placeholder={settings.srsRomajiInput ? "答え" : ""}
                style={{ fontSize: 16 }}
                className={`bg-app-muted text-app-text w-full rounded-xl border px-4 py-3 text-center font-bold transition-all duration-150 outline-none ${
                  focused
                    ? answerPhase === "revealed"
                      ? "border-red-600 ring-2 ring-red-600 ring-offset-0 ring-inset"
                      : answerPhase === "correct"
                        ? "border-green-500 ring-2 ring-green-500 ring-offset-0 ring-inset"
                        : "border-main-300 ring-main-300 ring-2 ring-offset-0 ring-inset"
                    : "border-app-border-strong"
                } `}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                autoFocus
              />

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  focusAnswerInput();
                }}
                onClick={() => {
                  const newValue = answer + "ー";
                  handleAnswerChange(newValue);

                  requestAnimationFrame(() => {
                    answerInputRef.current?.focus();
                    answerInputRef.current?.setSelectionRange(
                      newValue.length,
                      newValue.length,
                    );
                  });
                }}
                className="text-app-text-muted absolute top-0 right-0 px-6 py-3.5 font-bold"
              >
                ー
              </button>

              <button
                type="button"
                // Keep input focused / keyboard open when tapping the button (mobile).
                onPointerDown={(e) => {
                  e.preventDefault();
                  focusAnswerInput();
                }}
                onClick={() => {
                  void handlePrimaryAction();
                }}
                disabled={reviewing}
                className="bg-main-500 hover:bg-main-600 w-full rounded-xl py-3 font-bold text-white disabled:opacity-50"
              >
                {answerPhase === "typing"
                  ? t("common.check")
                  : t("common.continue")}
              </button>
            </div>
          </>
        ) : (
          <p className="text-app-text-muted text-center">
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
