import { ArrowLeft, Languages, Waves, BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import { themeVars } from "../theme";
import { useTranslation } from "../i18n/I18nProvider";

export function LearnedHubPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <div className="bg-app-surface sm:border-app-border mx-auto flex min-h-dvh max-w-2xl flex-col sm:box-content sm:border-r-2 sm:border-l-2">
      <div className="bg-app-surface border-app-border shrink-0 border-b px-5 pt-4 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="text-app-text-muted hover:text-app-text-secondary -ml-1 flex items-center gap-1.5 p-1 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-main-400 dark:text-main-500 text-[11px] font-semibold tracking-widest uppercase">
              {t("learned.hubTitle")}
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-1">
        <button
          onClick={() => navigate("/learned/words")}
          className="active:bg-app-muted border-app-border flex flex-1 flex-col items-center justify-center gap-3 border-r transition-colors"
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: themeVars.iconBg }}
          >
            <Languages size={22} className="text-main-400" strokeWidth={1.8} />
          </div>
          <div className="text-center">
            <p className="text-app-text text-base leading-tight font-bold">
              {t("learned.wordsTitle")}
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate("/learned/pronunciation")}
          className="active:bg-app-muted border-app-border flex flex-1 flex-col items-center justify-center gap-3 border-r transition-colors"
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: themeVars.iconBg }}
          >
            <Waves size={22} className="text-main-400" strokeWidth={1.8} />
          </div>
          <div className="text-center">
            <p className="text-app-text text-base leading-tight font-bold">
              {t("learned.pronunciationTitle")}
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate("/learned/meaning")}
          className="active:bg-app-muted flex flex-1 flex-col items-center justify-center gap-3 transition-colors"
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: themeVars.iconBg }}
          >
            <BookOpen size={22} className="text-main-400" strokeWidth={1.8} />
          </div>
          <div className="text-center">
            <p className="text-app-text text-base leading-tight font-bold">
              {t("learned.meaningTitle")}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
