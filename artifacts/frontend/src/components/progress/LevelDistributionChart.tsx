import { useMemo, useState } from "react";
import { useTranslation } from "../../i18n/I18nProvider";
import { themeVars } from "../../theme";
import {
  getLevelDistribution,
  type LevelMode,
} from "../../lib/progressStats";
import type { Word } from "../../types";

const MODES: LevelMode[] = ["word", "pron", "meaning"];

type LevelDistributionChartProps = {
  words: Word[];
};

function barColor(key: string): string {
  if (key === "star") return themeVars.star;
  const n = Number(key);
  if (n >= 1 && n <= 5) return themeVars.level(n);
  return "#e5e7eb";
}

export function LevelDistributionChart({ words }: LevelDistributionChartProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<LevelMode>("word");

  const buckets = useMemo(
    () => getLevelDistribution(words, mode),
    [words, mode],
  );
  const max = useMemo(
    () => Math.max(1, ...buckets.map((b) => b.count)),
    [buckets],
  );

  const modeLabel = (m: LevelMode) => {
    if (m === "word") return t("progress.levelMode.word");
    if (m === "pron") return t("progress.levelMode.pron");
    return t("progress.levelMode.meaning");
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              mode === m
                ? "bg-main-700 text-white"
                : "bg-app-muted text-app-text-secondary"
            }`}
          >
            {modeLabel(m)}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {buckets.map((b) => (
          <div key={b.key} className="flex items-center gap-3">
            <span className="w-6 text-xs font-bold text-app-text-secondary text-center shrink-0">
              {b.label}
            </span>
            <div className="flex-1 h-2.5 rounded-full bg-app-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${(b.count / max) * 100}%`,
                  background: barColor(b.key),
                  minWidth: b.count > 0 ? 4 : 0,
                }}
              />
            </div>
            <span className="w-8 text-xs tabular-nums text-app-text-secondary text-right shrink-0">
              {b.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
