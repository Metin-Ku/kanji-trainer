import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "../i18n/I18nProvider";
import { useAuth } from "../auth/AuthProvider";
import { useWords } from "../hooks/useWords";
import { useStudyHistory } from "../hooks/useStudyHistory";
import { StudyHeatmap } from "../components/progress/StudyHeatmap";
import { DeckActivityChart } from "../components/progress/DeckActivityChart";
import { LevelDistributionChart } from "../components/progress/LevelDistributionChart";
import { JlptProgressSection } from "../components/progress/JlptProgressSection";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";
import { membershipYear, yearRange } from "../lib/authApi";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-app-surface rounded-2xl border border-app-border p-4 min-w-0 overflow-hidden">
      <h2 className="text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ProgressPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { words, isLoading } = useWords();
  const { activityByDate, isLoading: activityLoading } = useStudyHistory();

  const currentYear = new Date().getFullYear();
  
  const minYear = user ? membershipYear(user.createdAt) : currentYear;
  const years = useMemo(
    () => yearRange(minYear, currentYear),
    [minYear, currentYear],
  );
  const [heatmapYear, setHeatmapYear] = useState(currentYear);
  
  return (
    <div className="min-h-dvh max-w-2xl mx-auto bg-app-bg flex flex-col sm:border-l sm:border-r sm:border-app-border">
      <div className="bg-app-surface border-b border-app-border px-5 pt-4 pb-4 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted hover:text-app-text-secondary transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-[11px] font-semibold text-main-500 dark:text-main-600 uppercase tracking-widest">
            {t("nav.progress")}
          </span>
        </button>
        <h1 className="text-xl font-bold text-app-text mt-2">
          {t("progress.title")}
        </h1>
        <p className="text-sm text-app-text-secondary mt-1">{t("progress.subtitle")}</p>
      </div>

      <div className="px-5 py-4 space-y-4 flex-1 overflow-y-auto overflow-x-hidden pb-8 min-w-0">
        {isLoading ? (
          <LoadingPlaceholder padding="lg" />
        ) : (
          <>
            <Section title={t("progress.sections.heatmap")}>
              <StudyHeatmap
                isMainPage={false}
                years={years}
                heatmapYear={heatmapYear}
                currentYear={currentYear}
                setHeatmapYear={setHeatmapYear}
                activityByDate={activityByDate}
                isActivityLoading={activityLoading}
                range={{ kind: "year", year: heatmapYear }}
              />
            </Section>

            <Section title={t("progress.sections.deckActivity")}>
              <DeckActivityChart activityByDate={activityByDate} days={84} />
            </Section>

            <Section title={t("progress.sections.levelDistribution")}>
              <LevelDistributionChart words={words} />
            </Section>

            <Section title={t("progress.sections.jlpt")}>
              <JlptProgressSection words={words} />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
