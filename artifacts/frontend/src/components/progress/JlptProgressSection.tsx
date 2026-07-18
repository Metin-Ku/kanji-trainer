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
      <div className="mb-4 flex gap-2">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
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
            <div className="mb-1 flex items-center justify-between">
              <span className="text-app-text text-sm font-semibold">
                {jlptLabel(band.jlpt)}
              </span>
              <span className="text-app-text-secondary text-xs tabular-nums">
                {band.total === 0
                  ? t("progress.jlpt.noWords")
                  : t("progress.jlpt.count", {
                      learned: band.learned,
                      total: band.total,
                      percent: Math.round(band.ratio * 100),
                    })}
              </span>
            </div>
            <div className="bg-app-muted h-2 overflow-hidden rounded-full">
              <div
                className="bg-main-500 h-full rounded-full transition-[width] duration-300"
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
