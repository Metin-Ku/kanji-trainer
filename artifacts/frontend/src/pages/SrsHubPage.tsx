import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Languages, Waves, ChevronRight, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { useSrsDecks, useSrsSync, fetchSrsQueue } from "../hooks/useSrs";
import { startSrsSession } from "../store/srsStore";
import {
  JLPT_LEVELS,
  type SrsDeckType,
  type SrsSortMode,
} from "../types/srs";
import { useTranslation } from "../i18n/I18nProvider";
import { srsDeckLabel } from "../i18n/srsDeckLabels";

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

  const sortOptions: { value: SrsSortMode; label: string }[] = [
    { value: "due-asc", label: t("srs.sort.dueAsc") },
    { value: "date-desc", label: t("srs.sort.dateDesc") },
    { value: "date-asc", label: t("srs.sort.dateAsc") },
  ];

  const [jlptMin, setJlptMin] = useState<string>("");
  const [jlptMax, setJlptMax] = useState<string>("");
  const [sort, setSort] = useState<SrsSortMode>("due-asc");
  const [starting, setStarting] = useState<SrsDeckType | null>(null);

  useEffect(() => {
    sync.mutate();
  }, []);

  async function startDeck(deck: SrsDeckType) {
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
      startSrsSession(deck, items, t("srs.hub.sessionTitlePrefix", { label: label.title }), "/srs", {
        jlptMin: jlptMin || null,
        jlptMax: jlptMax || null,
        sort,
      });
      navigate("/srs/study");
    } finally {
      setStarting(null);
    }
  }

  function statsFor(deck: SrsDeckType) {
    return decks.find((d) => d.deckType === deck) ?? { total: 0, due: 0, new: 0 };
  }

  return (
    <div className="min-h-dvh max-w-2xl mx-auto bg-gray-50 flex flex-col sm:border-l sm:border-r sm:border-gray-100">
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 p-1 -ml-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">{t("nav.srs")}</span>
        </button>
        <h1 className="text-xl font-bold text-gray-900 mt-2">{t("srs.hub.title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("srs.hub.subtitle")}</p>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("srs.hub.filters")}</p>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">{t("srs.hub.jlptMin")}</span>
              <select
                value={jlptMin}
                onChange={(e) => setJlptMin(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800"
              >
                <option value="">{t("common.all")}</option>
                {JLPT_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">{t("srs.hub.jlptMax")}</span>
              <select
                value={jlptMax}
                onChange={(e) => setJlptMax(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800"
              >
                <option value="">{t("common.all")}</option>
                {JLPT_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block">{t("srs.hub.sortLabel")}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SrsSortMode)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-2.5">
          {(["word", "pronunciation", "meaning", "example"] as SrsDeckType[]).map((deck) => {
            const Icon = DECK_ICONS[deck];
            const label = srsDeckLabel(t, deck);
            const stats = statsFor(deck);
            const reviewCount = stats.due + stats.new;

            return (
              <button
                key={deck}
                onClick={() => startDeck(deck)}
                disabled={starting === deck || isLoading}
                className="w-full flex items-center gap-4 bg-white rounded-2xl border border-gray-100 px-4 py-4 active:scale-[0.99] transition-transform disabled:opacity-60"
              >
                <div className="w-11 h-11 rounded-xl bg-main-50 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-main-500" strokeWidth={1.8} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label.subtitle}</p>
                  <p className="text-base font-bold text-gray-900">{label.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {reviewCount > 0 ? t("srs.hub.cardsReady", { count: reviewCount }) : t("srs.hub.noCardsToday")}
                    {stats.total > 0 && t("srs.hub.totalCards", { count: stats.total })}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-300 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
