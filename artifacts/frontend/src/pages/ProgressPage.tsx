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
    <section className="bg-app-surface border-app-border min-w-0 overflow-hidden rounded-2xl border p-4">
      <h2 className="text-app-text-muted mb-4 text-xs font-semibold tracking-wider uppercase">
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
    <div className="bg-app-bg sm:border-app-border mx-auto flex min-h-dvh max-w-2xl flex-col sm:box-content sm:border-r-2 sm:border-l-2">
      <div className="bg-app-surface border-app-border shrink-0 border-b px-5 pt-4 pb-4">
        <button
          onClick={() => navigate("/")}
          className="text-app-text-muted hover:text-app-text-secondary -ml-1 flex items-center gap-1.5 p-1 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-main-500 dark:text-main-600 text-[11px] font-semibold tracking-widest uppercase">
            {t("nav.progress")}
          </span>
        </button>
        <h1 className="text-app-text mt-2 text-xl font-bold">
          {t("progress.title")}
        </h1>
        <p className="text-app-text-secondary mt-1 text-sm">
          {t("progress.subtitle")}
        </p>
      </div>

      <div className="min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-5 py-4 pb-8">
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
