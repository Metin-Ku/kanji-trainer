import { useMemo, useState } from "react";
import { useTranslation } from "../../i18n/I18nProvider";
import { getJlptCompletion, type LevelMode } from "../../lib/progressStats";
import type { Word } from "../../types";

const MODES: LevelMode[] = ["word", "pron", "meaning"];

type JlptProgressSectionProps = {
  words: Word[];
};

export function JlptProgressSection({ words }: JlptProgressSectionProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<LevelMode>("word");

  const bands = useMemo(() => getJlptCompletion(words, mode), [words, mode]);

  const modeLabel = (m: LevelMode) => {
    if (m === "word") return t("progress.levelMode.word");
    if (m === "pron") return t("progress.levelMode.pron");
    return t("progress.levelMode.meaning");
  };

  const jlptLabel = (jlpt: string) =>
    jlpt === "untagged" ? t("progress.jlpt.untagged") : jlpt;

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

      <div className="space-y-3">
        {bands.map((band) => (
          <div key={band.jlpt}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-app-text">
                {jlptLabel(band.jlpt)}
              </span>
              <span className="text-xs text-app-text-secondary tabular-nums">
                {band.total === 0
                  ? t("progress.jlpt.noWords")
                  : t("progress.jlpt.count", {
                      learned: band.learned,
                      total: band.total,
                      percent: Math.round(band.ratio * 100),
                    })}
              </span>
            </div>
            <div className="h-2 rounded-full bg-app-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-main-500 transition-[width] duration-300"
                style={{
                  width: `${band.ratio * 100}%`,
                  minWidth: band.learned > 0 ? 4 : 0,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
