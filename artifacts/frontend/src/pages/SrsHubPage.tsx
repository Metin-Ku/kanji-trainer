import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Languages,
  Waves,
  ChevronRight,
  FileText,
  AlertCircle,
} from "lucide-react";
import { useLocation } from "wouter";
import { useSrsDecks, useSrsSync, fetchSrsQueue } from "../hooks/useSrs";
import { startSrsSession } from "../store/srsStore";
import { JLPT_LEVELS, type SrsDeckType, type SrsSortMode } from "../types/srs";
import { useTranslation } from "../i18n/I18nProvider";
import { srsDeckLabel } from "../i18n/srsDeckLabels";
import { DailyGoalCard } from "../components/DailyGoalCard";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useTroubleWordCount } from "../hooks/useTroubleWords";
import { getSrsListPrefs, saveSrsListPrefs } from "../lib/listPreferences";
import { warmMobileKeyboard } from "../lib/mobileKeyboard";

const DECK_ICONS: Record<SrsDeckType, typeof Languages> = {
  word: Languages,
  pronunciation: Waves,
  meaning: BookOpen,
  example: FileText,
};

export function SrsHubPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { data: decks = [], isLoading } = useSrsDecks();
  const sync = useSrsSync();
  const { data: troubleCount = 0, isLoading: troubleLoading } =
    useTroubleWordCount();

  const sortOptions: { value: SrsSortMode; label: string }[] = [
    { value: "due-asc", label: t("srs.sort.dueAsc") },
    { value: "date-desc", label: t("srs.sort.dateDesc") },
    { value: "date-asc", label: t("srs.sort.dateAsc") },
  ];

  const prefsScope = "srs";
  const defaultPrefs = {
    jlptMin: "",
    jlptMax: "",
    sort: "due-asc" as SrsSortMode,
  };
  const savedPrefs = getSrsListPrefs(prefsScope, defaultPrefs);

  const [jlptMin, setJlptMin] = useState<string>(savedPrefs.jlptMin);
  const [jlptMax, setJlptMax] = useState<string>(savedPrefs.jlptMax);
  const [sort, setSort] = useState<SrsSortMode>(savedPrefs.sort);
  const [starting, setStarting] = useState<SrsDeckType | null>(null);

  useEffect(() => {
    saveSrsListPrefs(prefsScope, { jlptMin, jlptMax, sort });
  }, [prefsScope, jlptMin, jlptMax, sort]);

  useEffect(() => {
    sync.mutate();
  }, []);

  async function startDeck(deck: SrsDeckType) {
    // Keyboard is warmed on pointerdown for example deck (before this await).
    setStarting(deck);
    try {
      const items = await fetchSrsQueue(deck, {
        jlptMin: jlptMin || null,
        jlptMax: jlptMax || null,
        sort,
      });
      if (items.length === 0) {
        alert(t("srs.hub.noCardsWithFilters"));
        return;
      }
      const label = srsDeckLabel(t, deck);
      startSrsSession(
        deck,
        items,
        t("srs.hub.sessionTitlePrefix", { label: label.title }),
        "/srs",
        {
          jlptMin: jlptMin || null,
          jlptMax: jlptMax || null,
          sort,
        },
      );
      navigate("/srs/study");
    } finally {
      setStarting(null);
    }
  }

  function statsFor(deck: SrsDeckType) {
    return (
      decks.find((d) => d.deckType === deck) ?? { total: 0, due: 0, new: 0 }
    );
  }

  return (
    <div className="bg-app-bg sm:border-app-border mx-auto flex min-h-dvh max-w-2xl flex-col sm:box-content sm:border-r-2 sm:border-l-2">
      <div className="bg-app-surface border-app-border shrink-0 border-b px-5 pt-4 pb-4">
        <button
          onClick={() => navigate("/")}
          className="text-app-text-muted hover:text-app-text-secondary -ml-1 flex items-center gap-1.5 p-1 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-main-400 dark:text-main-500 text-[11px] font-semibold tracking-widest uppercase">
            {t("nav.srs")}
          </span>
        </button>
        <h1 className="text-app-text mt-2 text-xl font-bold">
          {t("srs.hub.title")}
        </h1>
        <p className="text-app-text-secondary mt-1 text-sm">
          {t("srs.hub.subtitle")}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <DailyGoalCard variant="banner" />

        <button
          type="button"
          onClick={() => navigate("/srs/trouble")}
          className="bg-app-surface border-app-border flex w-full items-center gap-4 rounded-2xl border px-4 py-4 transition-transform active:scale-[0.99]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50">
            <AlertCircle size={20} className="text-red-500" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-app-text text-base font-bold">
              {t("srs.hub.troubleWordsTile")}
            </p>
            <p className="text-app-text-muted mt-0.5 flex min-h-[1rem] items-center text-xs">
              {troubleLoading ? (
                <LoadingSpinner size={14} className="text-app-text-muted" />
              ) : (
                t("srs.hub.troubleWordsCount", { count: troubleCount })
              )}
            </p>
          </div>
          <ChevronRight size={18} className="text-app-text-muted shrink-0" />
        </button>

        <div className="bg-app-surface border-app-border space-y-3 rounded-2xl border p-4">
          <p className="text-app-text-muted text-xs font-semibold tracking-wider uppercase">
            {t("srs.hub.filters")}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-app-text-secondary mb-1 block text-xs">
                {t("srs.hub.jlptMin")}
              </span>
              <select
                value={jlptMin}
                onChange={(e) => setJlptMin(e.target.value)}
                className="border-app-border-strong bg-app-muted text-app-text w-full rounded-xl border px-3 py-2 text-sm"
              >
                <option value="">{t("common.all")}</option>
                {JLPT_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-app-text-secondary mb-1 block text-xs">
                {t("srs.hub.jlptMax")}
              </span>
              <select
                value={jlptMax}
                onChange={(e) => setJlptMax(e.target.value)}
                className="border-app-border-strong bg-app-muted text-app-text w-full rounded-xl border px-3 py-2 text-sm"
              >
                <option value="">{t("common.all")}</option>
                {JLPT_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-app-text-secondary mb-1 block text-xs">
              {t("srs.hub.sortLabel")}
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SrsSortMode)}
              className="border-app-border-strong bg-app-muted text-app-text w-full rounded-xl border px-3 py-2 text-sm"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-2.5">
          {(
            ["word", "pronunciation", "meaning", "example"] as SrsDeckType[]
          ).map((deck) => {
            const Icon = DECK_ICONS[deck];
            const label = srsDeckLabel(t, deck);
            const stats = statsFor(deck);
            const reviewCount = stats.due + stats.new;

            return (
              <button
                key={deck}
                onPointerDown={() => {
                  if (deck === "example") warmMobileKeyboard();
                }}
                onClick={() => startDeck(deck)}
                disabled={starting === deck || isLoading}
                className="bg-app-surface border-app-border flex w-full items-center gap-4 rounded-2xl border px-4 py-4 transition-transform active:scale-[0.99] disabled:opacity-60"
              >
                <div className="bg-app-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                  <Icon
                    size={20}
                    className="text-main-500 dark:text-main-600"
                    strokeWidth={1.8}
                  />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-app-text-muted text-[10px] font-semibold tracking-wider uppercase">
                    {label.subtitle}
                  </p>
                  <p className="text-app-text text-base font-bold">
                    {label.title}
                  </p>
                  <p className="text-app-text-muted mt-0.5 flex min-h-[1rem] items-center text-xs">
                    {isLoading ? (
                      <LoadingSpinner
                        size={14}
                        className="text-app-text-muted"
                      />
                    ) : (
                      <>
                        {reviewCount > 0
                          ? t("srs.hub.cardsReady", { count: reviewCount })
                          : t("srs.hub.noCardsToday")}
                        {stats.total > 0 &&
                          t("srs.hub.totalCards", { count: stats.total })}
                      </>
                    )}
                  </p>
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
    </div>
  );
}
