import { useState } from "react";
import { DAILY_GOAL_DECK_IDS } from "../../lib/dailyGoal";
import {
  presetToDateRange,
  type StudiedWordsDateRange,
  type StudiedWordsPreset,
} from "../../lib/studiedWordsDate";
import { useStudiedWords } from "../../hooks/useStudiedWords";
import { srsDeckLabel } from "../../i18n/srsDeckLabels";
import { useTranslation } from "../../i18n/I18nProvider";
import { CompactWordList } from "../CompactWordList";
import { LoadingSpinner } from "../LoadingSpinner";
import type { SrsDeckType } from "../../types/srs";

const PRESETS: StudiedWordsPreset[] = [
  "today",
  "yesterday",
  "twoDaysAgo",
  "lastWeek",
];

function PresetChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
        active
          ? "bg-main-500 dark:bg-main-600 text-white"
          : "bg-app-muted text-app-text-secondary hover:bg-main-50 hover:text-main-600 dark:hover:bg-main-950 dark:hover:text-main-300"
      }`}
    >
      {label}
    </button>
  );
}

function DeckStudiedList({
  deck,
  range,
}: {
  deck: SrsDeckType;
  range: StudiedWordsDateRange;
}) {
  const { t } = useTranslation();
  const { data: words = [], isLoading } = useStudiedWords(deck, range);
  const { title } = srsDeckLabel(t, deck);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-app-text text-sm font-semibold">{title}</h3>
        {!isLoading && (
          <span className="text-app-text-muted text-xs tabular-nums">
            {t("common.wordCount", { count: words.length })}
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="border-app-border bg-app-surface flex justify-center rounded-lg border py-8">
          <LoadingSpinner size={22} />
        </div>
      ) : (
        <CompactWordList words={words} />
      )}
    </div>
  );
}

export function StudiedWordsSection() {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<StudiedWordsPreset | null>("today");
  const [range, setRange] = useState<StudiedWordsDateRange>(() =>
    presetToDateRange("today"),
  );

  function applyPreset(next: StudiedWordsPreset) {
    setPreset(next);
    setRange(presetToDateRange(next));
  }

  function updateFrom(value: string) {
    setPreset(null);
    setRange((prev) => ({
      ...prev,
      from: value || undefined,
    }));
  }

  function updateTo(value: string) {
    setPreset(null);
    setRange((prev) => ({
      ...prev,
      to: value || undefined,
    }));
  }

  const presetActive = (p: StudiedWordsPreset) => {
    if (preset !== p) return false;
    const expected = presetToDateRange(p);
    return range.from === expected.from && range.to === expected.to;
  };

  return (
    <section className="bg-app-surface border-app-border min-w-0 overflow-hidden rounded-2xl border p-4">
      <h2 className="text-app-text-muted mb-3 text-xs font-semibold tracking-wider uppercase">
        {t("progress.sections.studiedWords")}
      </h2>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <PresetChip
            key={p}
            label={t(`progress.studiedWords.presets.${p}`)}
            active={presetActive(p)}
            onClick={() => applyPreset(p)}
          />
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-app-text-muted block text-[10px] font-semibold tracking-wide uppercase">
            {t("progress.studiedWords.startDate")}
          </span>
          <input
            type="date"
            value={range.from ?? ""}
            onChange={(e) => updateFrom(e.target.value)}
            className="border-app-border bg-app-surface text-app-text w-full rounded-lg border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-app-text-muted block text-[10px] font-semibold tracking-wide uppercase">
            {t("progress.studiedWords.endDate")}
          </span>
          <input
            type="date"
            value={range.to ?? ""}
            onChange={(e) => updateTo(e.target.value)}
            className="border-app-border bg-app-surface text-app-text w-full rounded-lg border px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="space-y-5">
        {DAILY_GOAL_DECK_IDS.map((deck) => (
          <DeckStudiedList key={deck} deck={deck} range={range} />
        ))}
      </div>
    </section>
  );
}
