import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Dices, X } from "lucide-react";
import { KanjiStrokeModal } from "../components/KanjiStrokeModal";
import { useLocation } from "wouter";
import { getStudySession, StudyMode } from "../store/studyStore";
import { Word } from "../types";
import { themeVars } from "../theme";
import { apiUrl } from "../lib/apiOrigin";
import { useTranslation } from "../i18n/I18nProvider";
import { recordStudyUnit } from "../lib/dailyGoal";
const LONG_PRESS_MS = 320;
const LEVEL_STEP_PX = 30;

function getLevelInfo(word: Word, mode: StudyMode) {
  if (mode === "okunuş") return { level: word.pronLevel, starred: word.pronStarred };
  if (mode === "anlam") return { level: word.meaningLevel, starred: word.meaningStarred };
  return { level: word.level, starred: word.starred };
}

function getPrimary(word: Word, mode: StudyMode, emDash: string): string {
  if (mode === "okunuş") return word.pronunciation || emDash;
  if (mode === "anlam") return word.meaning || emDash;
  return word.kanji || emDash;
}

// idx: 0=lv1, 1=lv2, 2=lv3, 3=lv4, 4=lv5, 5=★
function levelToIdx(level: number, starred: boolean): number {
  return starred ? 5 : Math.max(0, level - 1);
}
function idxToLevelState(idx: number): { level: number; starred: boolean } {
  if (idx >= 5) return { level: 5, starred: true };
  return { level: idx + 1, starred: false };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function StudyPage() {
  const { t, formatStudyDate } = useTranslation();
  const [, navigate] = useLocation();
  const sessionRef = useRef(getStudySession());
  const [words, setWords] = useState(sessionRef.current.words);
  const { mode, title, backPath } = sessionRef.current;

  const [index, setIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showStroke, setShowStroke] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isFlying, setIsFlying] = useState(false);
  const [done, setDone] = useState(false);

  // Level mode state
  const [isLevelMode, setIsLevelMode] = useState(false);
  const [liveLevel, setLiveLevel] = useState(1);
  const [liveStarred, setLiveStarred] = useState(false);

  const mainRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLParagraphElement>(null);
  const touchTargetRef = useRef<EventTarget | null>(null);
  const showStrokeRef = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const flyingRef = useRef(false);
  const flyDirectionRef = useRef<"left" | "right">("right");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLevelModeRef = useRef(false);
  const levelStartX = useRef(0);
  const levelStartIdx = useRef(0);
  const liveLevelRef = useRef(1);
  const liveStarredRef = useRef(false);

  const indexRef = useRef(index);
  const wordsRef = useRef(words);
  indexRef.current = index;
  wordsRef.current = words;

  function clearLongPress() {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function advanceCard(direction: "left" | "right") {
    // if (direction === "right") {
    //   recordStudyUnit("flashcard");
    // }
    if (direction === "left") {
      const currentWord = wordsRef.current[indexRef.current];
      setWords(prev => [...prev, currentWord]);
    }
    const nextIndex = indexRef.current + 1;
    const newLength = direction === "left"
      ? wordsRef.current.length + 1
      : wordsRef.current.length;
    if (nextIndex >= newLength) {
      setDone(true);
    } else {
      setIndex(nextIndex);
    }
    setShowDetails(false);
    showStrokeRef.current = false;
    setShowStroke(false);
    setDragX(0);
    setIsFlying(false);
    flyingRef.current = false;
  }

  async function saveLevel(wordId: number, level: number, starred: boolean) {
    const patch: Record<string, unknown> = {};
    if (mode === "kelime") { patch.level = level; patch.starred = starred; }
    else if (mode === "okunuş") { patch.pronLevel = level; patch.pronStarred = starred; }
    else { patch.meaningLevel = level; patch.meaningStarred = starred; }

    setWords(prev => prev.map(w => w.id === wordId ? { ...w, ...patch } : w));

    fetch(apiUrl(`/api/words/${wordId}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
    //recordStudyUnit("flashcard");
  }

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (flyingRef.current) return;
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
      touchTargetRef.current = e.target;
      isDragging.current = false;

      const currentWord = wordsRef.current[indexRef.current];
      if (!currentWord) return;

      const { level, starred } = getLevelInfo(currentWord, mode);
      const startIdx = levelToIdx(level, starred);

      longPressTimer.current = setTimeout(() => {
        if (flyingRef.current || isDragging.current) return;
        levelStartX.current = touchStart.current?.x ?? t.clientX;
        levelStartIdx.current = startIdx;
        liveLevelRef.current = level;
        liveStarredRef.current = starred;
        isLevelModeRef.current = true;
        setIsLevelMode(true);
        setLiveLevel(level);
        setLiveStarred(starred);
      }, LONG_PRESS_MS);
    }

    function onTouchMove(e: TouchEvent) {
      if (flyingRef.current || !touchStart.current) return;
      const t = e.touches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;

      if (isLevelModeRef.current) {
        e.preventDefault();
        const totalDx = t.clientX - levelStartX.current;
        const steps = Math.round(totalDx / LEVEL_STEP_PX);
        const newIdx = Math.max(0, Math.min(5, levelStartIdx.current + steps));
        const { level: nl, starred: ns } = idxToLevelState(newIdx);
        liveLevelRef.current = nl;
        liveStarredRef.current = ns;
        setLiveLevel(nl);
        setLiveStarred(ns);
        return;
      }

      if (!isDragging.current) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          clearLongPress();
        }
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        isDragging.current = Math.abs(dx) > Math.abs(dy);
      }

      if (isDragging.current) {
        e.preventDefault();
        setDragX(dx);
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (flyingRef.current || !touchStart.current) return;
      clearLongPress();

      if (isLevelModeRef.current) {
        isLevelModeRef.current = false;
        setIsLevelMode(false);
        const currentWord = wordsRef.current[indexRef.current];
        if (currentWord) {
          saveLevel(currentWord.id, liveLevelRef.current, liveStarredRef.current);
        }
        touchStart.current = null;
        isDragging.current = false;
        return;
      }

      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      const wasDragging = isDragging.current;
      touchStart.current = null;
      isDragging.current = false;

      if (wasDragging && dx > 70) {
        flyDirectionRef.current = "right";
        flyingRef.current = true;
        setIsFlying(true);
        setTimeout(() => advanceCard("right"), 195);
      } else if (wasDragging && dx < -70) {
        flyDirectionRef.current = "left";
        flyingRef.current = true;
        setIsFlying(true);
        setTimeout(() => advanceCard("left"), 195);
      } else if (!wasDragging && Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        if (showStrokeRef.current) {
          // Stroke modal açıkken dışarıya dokunuldu — sadece modalı kapat, detay açma
          setDragX(0);
        } else {
          const tappedOnWord = wordRef.current && wordRef.current.contains(touchTargetRef.current as Node);
          const w = wordsRef.current[indexRef.current];
          if (tappedOnWord && w?.kanji) {
            showStrokeRef.current = true;
            setShowStroke(true);
          } else {
            setShowDetails(v => !v);
          }
          setDragX(0);
        }
      } else {
        setDragX(0);
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      clearLongPress();
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [mode]);

  function handleRestart() {
    setWords(shuffle(words));
    setIndex(0);
    setShowDetails(false);
    showStrokeRef.current = false;
    setShowStroke(false);
    setDragX(0);
    setIsFlying(false);
    setDone(false);
    setIsLevelMode(false);
  }

  const word = words[index];

  if (!word && !done) {
    return (
      <div className="min-h-dvh max-w-2xl mx-auto flex flex-col items-center justify-center bg-app-surface sm:border-l sm:border-r sm:border-app-border">
        <p className="text-app-text-muted">{t("study.notFound")}</p>
        <button onClick={() => navigate(backPath)} className="mt-4 text-main-400 text-sm">{t("study.backToList")}</button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-dvh max-w-2xl mx-auto flex flex-col bg-app-surface sm:border-l sm:border-r sm:border-app-border">
        <div className="sticky top-0 z-20 bg-app-surface border-b border-app-border px-5 pt-4 pb-4 flex items-center">
          <button onClick={() => navigate(backPath)} className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted">
            <ArrowLeft size={18} />
            <span className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">{title}</span>
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background: themeVars.star }}>★</div>
          <div>
            <p className="text-2xl font-bold text-app-text mb-1">{t("common.completed")}</p>
            <p className="text-sm text-app-text-muted">{t("study.finishedCount", { count: words.length })}</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={handleRestart}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-white text-sm"
              style={{ background: themeVars.level(1) }}
            >
              <Dices size={16} strokeWidth={2} />
              {t("study.shuffleAgain")}
            </button>
            <button
              onClick={() => navigate(backPath)}
              className="w-full py-3 rounded-2xl font-semibold text-sm border border-app-border-strong text-app-text-secondary"
            >
              {t("study.backToList")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { level, starred } = getLevelInfo(word, mode);
  const displayLevel = isLevelMode ? liveLevel : level;
  const displayStarred = isLevelMode ? liveStarred : starred;
  const displayColor = displayStarred ? themeVars.star : themeVars.level(displayLevel);

  const isAnimating = isFlying || dragX !== 0;
  const cardTransform = isFlying
    ? flyDirectionRef.current === "left"
      ? "translateX(-110vw) rotate(-12deg)"
      : "translateX(110vw) rotate(12deg)"
    : dragX !== 0
    ? `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`
    : "translateX(0) rotate(0deg)";
  const cardTransition = isFlying ? "transform 0.18s ease" : dragX !== 0 ? "none" : "transform 0.22s ease";

  return (
    <div className="min-h-dvh max-w-2xl mx-auto bg-app-surface flex flex-col select-none sm:border-l sm:border-r sm:border-app-border">
      <div className="sticky top-0 z-20 bg-app-surface border-b border-app-border px-5 pt-4 pb-4 flex items-center justify-between shrink-0">
        <button onClick={() => navigate(backPath)} className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted">
          <ArrowLeft size={18} />
          <span className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">{title}</span>
        </button>
        <span className="text-sm text-app-text-muted p-1.5 font-medium tabular-nums">{t("common.cardProgress", { current: index + 1, total: words.length })}</span>
      </div>

      <div ref={mainRef} className="flex-1 relative overflow-hidden" style={{ touchAction: "none" }}>
        <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: "none" }}>
          <div
            style={{
              transform: cardTransform,
              transition: cardTransition,
              pointerEvents: "auto",
              willChange: isAnimating ? "transform" : "auto",
            }}
            className="flex flex-col items-center gap-5 px-8 w-full max-w-sm"
          >
            <p
              ref={wordRef}
              className="font-bold text-app-text text-center leading-tight"
              style={{ fontSize: mode === "anlam" ? "1.4rem" : "3rem" }}
            >
              {getPrimary(word, mode, t("common.emDash"))}
            </p>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              {word.date && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-app-muted text-app-text-secondary">
                  {formatStudyDate(word.date)}
                </span>
              )}
              {word.jlptLevel && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-app-muted text-app-text-secondary">
                  {word.jlptLevel}
                </span>
              )}

              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{
                  background: displayColor,
                  outline: isLevelMode ? `2px solid ${displayColor}` : "2px solid transparent",
                  outlineOffset: "3px",
                  transition: "background 0.15s ease, outline-color 0.15s ease",
                }}
              >
                {displayStarred ? "★" : displayLevel}
              </div>
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 bg-app-surface border-t border-app-border rounded-t-2xl shadow-xl"
          style={{
            transform: showDetails ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
            maxHeight: "55vh",
            overflowY: "auto",
            zIndex: 10,
          }}
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-app-border-strong" />
          </div>
          <div className="px-6 pb-6 pt-2 space-y-4">
            {mode !== "kelime" && word.kanji && (
              <div>
                <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest mb-1">{t("study.detailLabels.word")}</p>
                <p className="text-3xl font-bold text-app-text">{word.kanji}</p>
              </div>
            )}
            {mode !== "okunuş" && word.pronunciation && (
              <div>
                <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest mb-1">{t("study.detailLabels.pronunciation")}</p>
                <p className="text-lg font-medium text-app-text">{word.pronunciation}</p>
              </div>
            )}
            {mode !== "anlam" && word.meaning && (
              <div>
                <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest mb-1">{t("study.detailLabels.meaning")}</p>
                <p className="text-base text-app-text">{word.meaning}</p>
              </div>
            )}
            {word.description && (
              <div className="pt-3 border-t border-app-border">
                <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest mb-1">{t("study.detailLabels.description")}</p>
                <p className="whitespace-pre-wrap text-sm text-app-text-secondary leading-relaxed">{word.description}</p>
              </div>
            )}
          </div>
        </div>

        {showStroke && word.kanji && (
          <KanjiStrokeModal
            kanji={word.kanji}
            onClose={() => { showStrokeRef.current = false; setShowStroke(false); }}
            variant="sheet"
          />
        )}
      </div>
    </div>
  );
}
