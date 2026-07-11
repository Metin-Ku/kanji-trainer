import { memo, useState } from "react";
import { Check, ChevronDown, Flame } from "lucide-react";
import { useTranslation } from "../i18n/I18nProvider";
import { useDailyGoal } from "../hooks/useDailyGoal";
import { srsDeckLabel } from "../i18n/srsDeckLabels";
import type { DeckDailyProgress } from "../lib/dailyGoal";

type DailyGoalCardProps = {
  variant?: "card" | "banner";
};

function deckLabel(
  t: (key: string) => string,
  deck: DeckDailyProgress["deck"],
): string {
  //if (deck === "flashcard") return t("dailyGoal.decks.flashcard");
  return srsDeckLabel(t, deck).title;
}

function ProgressBar({
  ratio,
  goalMet,
  size = "md",
}: {
  ratio: number;
  goalMet: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={`rounded-full bg-app-surface overflow-hidden ${size === "sm" ? "h-1.5" : "h-2"}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ease-out ${
          goalMet ? "bg-main-500" : "bg-main-400"
        }`}
        style={{ width: `${Math.round(ratio * 100)}%` }}
      />
    </div>
  );
}

const DeckRow = memo(function DeckRow({
  deck,
  compact,
}: {
  deck: DeckDailyProgress;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  if (!deck.enabled) return null;

  const label = deckLabel(t, deck.deck);
  const progressLabel = t("dailyGoal.progress", {
    count: deck.count,
    target: deck.target,
  });

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`truncate font-medium text-app-text ${compact ? "text-xs" : "text-sm"}`}
          >
            {label}
          </span>
          {deck.goalMet && (
            <Check size={12} className="text-main-500 shrink-0" strokeWidth={2.5} />
          )}
        </div>
        <span
          className={`tabular-nums shrink-0 ${compact ? "text-xs text-app-text-secondary" : "text-sm font-semibold text-app-text"}`}
        >
          {progressLabel}
        </span>
      </div>
      <ProgressBar ratio={deck.progressRatio} goalMet={deck.goalMet} size="sm" />
    </div>
  );
});

export function DailyGoalCard({ variant = "card" }: DailyGoalCardProps) {
  const { t } = useTranslation();
  const { count, target, remaining, goalMet, streak, progressRatio, decks } =
    useDailyGoal();
  const [expanded, setExpanded] = useState(false);
  const [detailsMounted, setDetailsMounted] = useState(false);

  const progressLabel = t("dailyGoal.progress", { count, target });
  const statusLabel = goalMet
    ? t("dailyGoal.complete")
    : t("dailyGoal.remaining", { count: remaining });

  const enabledDecks = decks.filter((d) => d.enabled);
  const shellClass =
    variant === "banner"
      ? `rounded-sm border px-4 py-5 border-main-200 bg-app-accent/40`
      : `rounded-sm border px-4 py-5 mt-4 border-main-200 dark:border-main-900 bg-app-accent/40`;
  // bg-[linear-gradient(135deg,color-mix(in_oklch,var(--main-400)_13%,transparent),color-mix(in_oklch,var(--main-600)_8%,transparent))]
  return (
    <div className={shellClass}>
      <button
        type="button"
        onClick={() =>
          setExpanded((v) => {
            const next = !v;
            if (next) setDetailsMounted(true);
            return next;
          })
        }
        className="w-full text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-semibold text-app-text-secondary uppercase tracking-wider">
                {t("dailyGoal.title")}
              </p>
              {goalMet && (
                <Check size={14} className="text-main-500 shrink-0" strokeWidth={2.5} />
              )}
            </div>
            <p
              className={`font-bold text-app-text leading-tight ${variant === "banner" ? "text-sm" : "text-lg"}`}
            >
              {progressLabel}
            </p>
            <p className="text-xs text-app-text-secondary mt-0.5">{statusLabel}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {streak > 0 ? (
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-app-surface/80 border border-main-100">
                <Flame size={variant === "banner" ? 14 : 16} className="text-main-500" />
                <span className="text-sm font-bold text-main-600">{streak}</span>
              </div>
            ) : (
              variant !== "banner" && (
                <p className="text-[11px] text-app-text-secondary max-w-24 leading-snug text-right">
                  {t("dailyGoal.streakNone")}
                </p>
              )
            )}
            <ChevronDown
              size={18}
              className={`text-app-text-secondary transition-transform duration-200 ease-out ${expanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>
        <div className={`${variant === "banner" ? "mt-2" : "mt-2.5"}`}>
          <ProgressBar ratio={progressRatio} goalMet={goalMet} />
        </div>
        {variant === "banner" && streak > 0 && (
          <p className="text-[11px] text-main-600 font-medium mt-2">
            {t("dailyGoal.streak", { days: streak })}
          </p>
        )}
      </button>

      <div
        className={`overflow-hidden transition-[max-height] duration-200 ease-out motion-reduce:transition-none ${
          expanded ? "max-h-80" : "max-h-0"
        }`}
      >
        {detailsMounted && (
          <div className="pt-3 border-t border-app-border/80">
            <p className="text-[10px] font-semibold text-app-text-muted uppercase tracking-wider mb-2.5">
              {t("dailyGoal.byDeck")}
            </p>
            <div className="space-y-3">
              {enabledDecks.length === 0 ? (
                <p className="text-xs text-app-text-muted">{t("dailyGoal.noDeckTargets")}</p>
              ) : (
                enabledDecks.map((deck) => (
                  <DeckRow key={deck.deck} deck={deck} compact={variant === "banner"} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
