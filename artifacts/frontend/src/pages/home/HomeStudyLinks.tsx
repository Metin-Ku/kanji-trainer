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
      <p className="text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-2.5 px-1">
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
              className="w-full flex items-center gap-4 bg-app-surface rounded-2xl border border-app-border px-4 py-3.5 active:scale-[0.99] transition-transform disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-xl bg-app-accent flex items-center justify-center shrink-0">
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
              <div className="flex-1 text-left min-w-0">
                <p className="text-base font-bold text-app-text">
                  {t(titleKey)}
                </p>
                <div className="flex items-center gap-1">
                  {loading ? (
                    <>
                      <LoadingSpinner
                        size={14}
                        className="text-app-text-muted"
                      />
                      <p className="text-xs text-app-text-muted mt-0.5 invisible">
                        {studyCountLabel(titleKey, studyCounts[titleKey], t)}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-app-text-muted mt-0.5">
                      {studyCountLabel(titleKey, studyCounts[titleKey], t)}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-app-text-muted shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
