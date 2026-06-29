import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Dices, Pencil } from "lucide-react";
import { KanjiStrokeModal } from "../components/KanjiStrokeModal";
import { WordFormModal } from "../components/WordFormModal";
import {
  RelatedWordsList,
  RelatedWordsButton,
} from "../components/RelatedWordsList";
import { useLocation } from "wouter";
import { getSrsSession } from "../store/srsStore";
import { reviewSrsCard } from "../hooks/useSrs";
import type { SrsDeckType, SrsQueueItem, ReviewRating } from "../types/srs";
import type { Word, WordUpdate } from "../types";
import { themeVars } from "../theme";
import { useWords } from "../hooks/useWords";

const MONTHS = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const d = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[0], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return `${d} ${MONTHS[m]} ${y}`;
  }
  return dateStr;
}

function getPrimary(item: SrsQueueItem, deck: SrsDeckType): string {
  const { word } = item;
  if (deck === "pronunciation") return word.pronunciation || "—";
  if (deck === "meaning") return word.meaning || "—";
  return word.kanji || "—";
}

function queueWordToWord(item: SrsQueueItem): Word {
  return {
    ...item.word,
    relatedWordIds: item.word.relatedWordIds ?? [],
  };
}

const RATING_BUTTONS: {
  rating: ReviewRating;
  label: string;
  key: keyof SrsQueueItem["card"]["intervals"];
  className: string;
}[] = [
  {
    rating: 1,
    label: "Again",
    key: "again",
    className: "bg-gray-100 hover:bg-red-600",
  },
  {
    rating: 2,
    label: "Hard",
    key: "hard",
    className: "bg-gray-100 hover:bg-main-800",
  },
  {
    rating: 3,
    label: "Good",
    key: "good",
    className: "bg-gray-100 hover:bg-main-600",
  },
  {
    rating: 4,
    label: "Easy",
    key: "easy",
    className: "bg-gray-100 hover:bg-emerald-600",
  },
];

export function SrsStudyPage() {
  const [, navigate] = useLocation();
  const sessionRef = useRef(getSrsSession());
  const { deck, title, backPath } = sessionRef.current;
  const { words, updateWord } = useWords();

  const [items, setItems] = useState(sessionRef.current.items);
  const [index, setIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showStroke, setShowStroke] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isFlying, setIsFlying] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const mainRef = useRef<HTMLDivElement>(null);
  const ratingBarRef = useRef<HTMLDivElement>(null);
  const [ratingBarHeight, setRatingBarHeight] = useState(72);
  const wordRef = useRef<HTMLParagraphElement>(null);
  const touchTargetRef = useRef<EventTarget | null>(null);
  const showStrokeRef = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const flyingRef = useRef(false);
  const flyDirectionRef = useRef<"left" | "right">("right");
  const reviewingRef = useRef(false);

  const indexRef = useRef(index);
  const itemsRef = useRef(items);
  indexRef.current = index;
  itemsRef.current = items;
  reviewingRef.current = reviewing;

  const advanceAfterReview = useCallback(() => {
    const nextIndex = indexRef.current + 1;
    if (nextIndex >= itemsRef.current.length) {
      setDone(true);
    } else {
      setIndex(nextIndex);
    }
    setShowDetails(false);
    showStrokeRef.current = false;
    setShowStroke(false);
    setShowRelated(false);
    setDragX(0);
    setIsFlying(false);
    flyingRef.current = false;
  }, []);

  const advanceRequeue = useCallback(() => {
    const current = itemsRef.current[indexRef.current];
    setItems((prev) => [
      ...prev.slice(0, indexRef.current),
      ...prev.slice(indexRef.current + 1),
      current,
    ]);
    setShowDetails(false);
    showStrokeRef.current = false;
    setShowStroke(false);
    setShowRelated(false);
    setDragX(0);
    setIsFlying(false);
    flyingRef.current = false;
  }, []);

  const submitReview = useCallback(
    async (rating: ReviewRating) => {
      if (reviewingRef.current) return;
      const current = itemsRef.current[indexRef.current];
      if (!current) return;

      reviewingRef.current = true;
      setReviewing(true);
      try {
        await reviewSrsCard(current.card.id, rating);
        advanceAfterReview();
      } catch {
        alert("Kart kaydedilemedi. Tekrar deneyin.");
        setDragX(0);
        setIsFlying(false);
        flyingRef.current = false;
      } finally {
        reviewingRef.current = false;
        setReviewing(false);
      }
    },
    [advanceAfterReview],
  );

  function handleReviewClick(rating: ReviewRating) {
    submitReview(rating);
  }

  const submitReviewRef = useRef(submitReview);
  submitReviewRef.current = submitReview;

  useEffect(() => {
    const el = ratingBarRef.current;
    if (!el) return;
    const update = () => setRatingBarHeight(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (flyingRef.current || reviewingRef.current) return;
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
      touchTargetRef.current = e.target;
      isDragging.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (flyingRef.current || !touchStart.current || reviewingRef.current)
        return;
      const t = e.touches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;

      if (!isDragging.current) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          isDragging.current = Math.abs(dx) > Math.abs(dy);
        }
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      }

      if (isDragging.current) {
        e.preventDefault();
        setDragX(dx);
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (flyingRef.current || !touchStart.current || reviewingRef.current)
        return;

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
        setTimeout(() => {
          submitReviewRef.current(3);
        }, 195);
      } else if (wasDragging && dx < -70) {
        flyDirectionRef.current = "left";
        flyingRef.current = true;
        setIsFlying(true);
        setTimeout(() => advanceRequeue(), 195);
      } else if (!wasDragging && Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        if (showStrokeRef.current) {
          setDragX(0);
        } else {
          const tappedOnWord =
            wordRef.current &&
            wordRef.current.contains(touchTargetRef.current as Node);
          const w = itemsRef.current[indexRef.current]?.word;
          if (tappedOnWord && w?.kanji && deck === "word") {
            showStrokeRef.current = true;
            setShowStroke(true);
          } else {
            setShowDetails((v) => !v);
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

    // Pointer events for mouse / trackpad on desktop
    function onPointerDown(e: PointerEvent) {
      if (e.pointerType === "touch") return;
      if (flyingRef.current || reviewingRef.current) return;
      touchStart.current = { x: e.clientX, y: e.clientY };
      touchTargetRef.current = e.target;
      isDragging.current = false;
      el.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerType === "touch") return;
      if (flyingRef.current || !touchStart.current || reviewingRef.current)
        return;
      const dx = e.clientX - touchStart.current.x;
      const dy = e.clientY - touchStart.current.y;

      if (!isDragging.current) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          isDragging.current = Math.abs(dx) > Math.abs(dy);
        }
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      }

      if (isDragging.current) {
        e.preventDefault();
        setDragX(dx);
      }
    }

    function onPointerUp(e: PointerEvent) {
      if (e.pointerType === "touch") return;
      if (!touchStart.current) return;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      if (flyingRef.current || reviewingRef.current) return;

      const dx = e.clientX - touchStart.current.x;
      const dy = e.clientY - touchStart.current.y;
      const wasDragging = isDragging.current;
      touchStart.current = null;
      isDragging.current = false;

      if (wasDragging && dx > 70) {
        flyDirectionRef.current = "right";
        flyingRef.current = true;
        setIsFlying(true);
        setTimeout(() => submitReviewRef.current(3), 195);
      } else if (wasDragging && dx < -70) {
        flyDirectionRef.current = "left";
        flyingRef.current = true;
        setIsFlying(true);
        setTimeout(() => advanceRequeue(), 195);
      } else if (!wasDragging && Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        if (showStrokeRef.current) {
          setDragX(0);
        } else {
          const tappedOnWord =
            wordRef.current &&
            wordRef.current.contains(touchTargetRef.current as Node);
          const w = itemsRef.current[indexRef.current]?.word;
          if (tappedOnWord && w?.kanji && deck === "word") {
            showStrokeRef.current = true;
            setShowStroke(true);
          } else {
            setShowDetails((v) => !v);
          }
          setDragX(0);
        }
      } else {
        setDragX(0);
      }
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, [deck, advanceRequeue]);

  function handleRestart() {
    setItems([...sessionRef.current.items].sort(() => Math.random() - 0.5));
    setIndex(0);
    setShowDetails(false);
    showStrokeRef.current = false;
    setShowStroke(false);
    setShowRelated(false);
    setDragX(0);
    setIsFlying(false);
    setDone(false);
  }

  function handleSave(data: WordUpdate & { relatedWordIds: number[] }) {
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
                },
              }
            : item,
        ),
      );
    }
    setShowEdit(false);
  }

  const item = items[index];
  const intervals = item?.card.intervals;

  if (!item && !done) {
    return (
      <div className="min-h-dvh max-w-2xl mx-auto flex flex-col items-center justify-center bg-white sm:border-l sm:border-r sm:border-gray-100">
        <p className="text-gray-400">Kart bulunamadı</p>
        <button
          onClick={() => navigate(backPath)}
          className="mt-4 text-main-400 text-sm"
        >
          Geri Dön
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-dvh max-w-2xl mx-auto flex flex-col bg-white sm:border-l sm:border-r sm:border-gray-100">
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 pt-4 pb-3 flex items-center">
          <button
            onClick={() => navigate(backPath)}
            className="flex items-center gap-1.5 p-1 -ml-1 text-gray-400"
          >
            <ArrowLeft size={18} />
            <span className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">
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
            <p className="text-2xl font-bold text-gray-900 mb-1">Tamamlandı!</p>
            <p className="text-sm text-gray-400">
              Bu oturumdaki kartları bitirdin
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={handleRestart}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-gray-500 text-sm"
              style={{ background: themeVars.level(1) }}
            >
              <Dices size={16} strokeWidth={2} />
              Yeniden Başla
            </button>
            <button
              onClick={() => navigate(backPath)}
              className="w-full py-3 rounded-2xl font-semibold text-sm border border-gray-200 text-gray-600"
            >
              Destelere Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { word } = item;
  const isAnimating = isFlying || dragX !== 0;
  const cardTransform = isFlying
    ? flyDirectionRef.current === "left"
      ? "translateX(-110vw) rotate(-12deg)"
      : "translateX(110vw) rotate(12deg)"
    : dragX !== 0
      ? `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`
      : "translateX(0) rotate(0deg)";
  const cardTransition = isFlying
    ? "transform 0.18s ease"
    : dragX !== 0
      ? "none"
      : "transform 0.22s ease";

  const liveWord = words.find((w) => w.id === word.id) ?? queueWordToWord(item);

  return (
    <div className="min-h-dvh max-w-2xl mx-auto bg-white flex flex-col select-none sm:border-l sm:border-r sm:border-gray-100">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
        <button
          onClick={() => navigate(backPath)}
          className="flex items-center gap-1.5 p-1 -ml-1 text-gray-400"
        >
          <ArrowLeft size={18} />
          <span className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">
            {title}
          </span>
        </button>
        <span className="text-sm text-gray-400 font-medium tabular-nums">
          {index + 1} / {items.length}
        </span>
      </div>

      <div
        ref={mainRef}
        className="flex-1 relative overflow-hidden"
        style={{ touchAction: "none", paddingBottom: ratingBarHeight }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: "none" }}
        >
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
              className="font-bold text-gray-900 text-center leading-tight"
              style={{ fontSize: deck === "meaning" ? "1.4rem" : "3rem" }}
            >
              {getPrimary(item, deck)}
            </p>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              {word.date && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-500">
                  {formatDate(word.date)}
                </span>
              )}
              {word.jlptLevel && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-500">
                  {word.jlptLevel}
                </span>
              )}
            </div>
          </div>
        </div>

        {showStroke && word.kanji && (
          <KanjiStrokeModal
            kanji={word.kanji}
            onClose={() => {
              showStrokeRef.current = false;
              setShowStroke(false);
            }}
            variant="sheet"
          />
        )}
      </div>

      {/* SRS-only: fixed above rating bar so it is not covered and taps do not hit mainRef */}
      <div
        className="fixed left-0 right-0 z-20 max-w-2xl mx-auto bg-white border-t border-gray-100 rounded-t-2xl shadow-xl sm:border-l sm:border-r pointer-events-auto"
        style={{
          bottom: ratingBarHeight,
          transform: showDetails ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          maxHeight: "55vh",
          overflowY: "auto",
          pointerEvents: showDetails ? "auto" : "none",
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className={`px-6 pb-4 pt-2 relative ${showRelated && liveWord.meaning ? "" : "pr-24"}`}>
          <div className="absolute top-2 right-6 flex flex-row items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="flex items-center justify-center px-3 py-1.5 w-10 h-8 rounded-lg bg-gray-100 text-gray-600"
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
            <div className="space-y-4">
              {deck !== "word" && word.kanji && (
                <div>
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1">
                    Kelime
                  </p>
                  <p className="text-3xl font-bold text-gray-800">{word.kanji}</p>
                </div>
              )}
              {deck !== "pronunciation" && word.pronunciation && (
                <div>
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1">
                    Okunuş
                  </p>
                  <p className="text-lg font-medium text-gray-700">
                    {word.pronunciation}
                  </p>
                </div>
              )}
              {deck !== "meaning" && word.meaning && (
                <div>
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1">
                    Anlam
                  </p>
                  <p className="text-base text-gray-700">{word.meaning}</p>
                </div>
              )}
              {word.description && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1">
                    Açıklama
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-gray-600 leading-relaxed">
                    {word.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        ref={ratingBarRef}
        className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 px-3 py-3 max-w-2xl mx-auto sm:border-l sm:border-r"
      >
        <div className="grid grid-cols-4 gap-2">
          {RATING_BUTTONS.map(({ rating, label, key, className }) => (
            <button
              key={rating}
              onClick={() => handleReviewClick(rating)}
              disabled={reviewing}
              className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-gray-500 text-xs font-semibold transition-opacity disabled:opacity-50 ${className}`}
            >
              <span>{label}</span>
              {intervals && (
                <span className="text-[10px] font-normal opacity-90 mt-0.5">
                  {intervals[key]}
                </span>
              )}
            </button>
          ))}
        </div>
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
