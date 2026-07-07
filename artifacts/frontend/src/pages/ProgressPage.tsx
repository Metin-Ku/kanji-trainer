import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "../i18n/I18nProvider";
import { useWords } from "../hooks/useWords";
import { useStudyHistory } from "../hooks/useStudyHistory";
import { StudyHeatmap } from "../components/progress/StudyHeatmap";
import { DeckActivityChart } from "../components/progress/DeckActivityChart";
import { LevelDistributionChart } from "../components/progress/LevelDistributionChart";
import { JlptProgressSection } from "../components/progress/JlptProgressSection";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ProgressPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { words, isLoading } = useWords();
  const activityByDate = useStudyHistory();

  return (
    <div className="min-h-dvh max-w-2xl mx-auto bg-gray-50 flex flex-col sm:border-l sm:border-r sm:border-gray-100">
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-4 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 p-1 -ml-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">
            {t("nav.progress")}
          </span>
        </button>
        <h1 className="text-xl font-bold text-gray-900 mt-2">
          {t("progress.title")}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{t("progress.subtitle")}</p>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto pb-8">
        {isLoading ? (
          <LoadingPlaceholder padding="lg" />
        ) : (
          <>
            <Section title={t("progress.sections.heatmap")}>
              <StudyHeatmap activityByDate={activityByDate} weeks={26} />
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
