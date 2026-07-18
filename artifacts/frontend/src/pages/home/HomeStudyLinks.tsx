import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTranslation } from "../../i18n/I18nProvider";
import {
  STUDY_LINKS,
  buildStudyCounts,
  studyCountLabel,
  type StudyLinkTitleKey,
} from "./studyLinks";
import type { Word } from "../../types";
import type { ThemeSummary } from "../../types";
import type { CategorySummary } from "../../hooks/useCategories";

interface Props {
  words: Word[];
  themes: ThemeSummary[];
  categories: CategorySummary[];
  isLoading: boolean;
  themesLoading: boolean;
  categoriesLoading: boolean;
}

export function HomeStudyLinks({
  words,
  themes,
  categories,
  isLoading,
  themesLoading,
  categoriesLoading,
}: Props) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const studyCounts = buildStudyCounts(words, themes, categories);

  function countLoading(titleKey: StudyLinkTitleKey) {
    if (titleKey === "nav.themes") return themesLoading;
    if (titleKey === "nav.categories") return categoriesLoading;
    if (titleKey === "nav.decks") return false;
    return isLoading;
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 pb-24">
      <p className="text-app-text-muted mb-2.5 px-1 text-xs font-semibold tracking-wider uppercase">
        {t("home.studySection")}
      </p>
      <div className="space-y-2">
        {STUDY_LINKS.map(({ path, Icon, titleKey }) => {
          const star = titleKey === "nav.learned";
          const loading = countLoading(titleKey);

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              disabled={
                isLoading ||
                (titleKey === "nav.themes" && themesLoading) ||
                (titleKey === "nav.categories" && categoriesLoading)
              }
              className="bg-app-surface border-app-border flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 transition-transform active:scale-[0.99] disabled:opacity-60"
            >
              <div className="bg-app-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                {star ? (
                  <span className="text-main-500">★</span>
                ) : (
                  Icon && (
                    <Icon
                      size={18}
                      className="text-main-500 dark:text-main-600"
                      strokeWidth={1.8}
                    />
                  )
                )}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-app-text text-base font-bold">
                  {t(titleKey)}
                </p>
                <div className="flex items-center gap-1">
                  {loading ? (
                    <>
                      <LoadingSpinner
                        size={14}
                        className="text-app-text-muted"
                      />
                      <p className="text-app-text-muted invisible mt-0.5 text-xs">
                        {studyCountLabel(titleKey, studyCounts[titleKey], t)}
                      </p>
                    </>
                  ) : (
                    <p className="text-app-text-muted mt-0.5 text-xs">
                      {studyCountLabel(titleKey, studyCounts[titleKey], t)}
                    </p>
                  )}
                </div>
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
  );
}
