import { ArrowLeft, Languages, Waves, BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import { themeVars } from "../theme";
import { useTranslation } from "../i18n/I18nProvider";

export function LearnedHubPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-dvh max-w-2xl mx-auto bg-app-surface flex flex-col sm:border-l sm:border-r sm:border-app-border">
      <div className="bg-app-surface border-b border-app-border px-5 pt-4 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted hover:text-app-text-secondary transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-[11px] font-semibold text-main-500 dark:text-main-600 uppercase tracking-widest">
              {t("learned.hubTitle")}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        <button
          onClick={() => navigate("/learned/words")}
          className="flex-1 flex flex-col items-center justify-center gap-3 active:bg-app-muted transition-colors border-r border-app-border"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: themeVars.iconBg }}
          >
            <Languages size={22} className="text-main-400" strokeWidth={1.8} />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-app-text leading-tight">
              {t("learned.wordsTitle")}
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate("/learned/pronunciation")}
          className="flex-1 flex flex-col items-center justify-center gap-3 active:bg-app-muted transition-colors border-r border-app-border"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: themeVars.iconBg }}
          >
            <Waves size={22} className="text-main-400" strokeWidth={1.8} />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-app-text leading-tight">
              {t("learned.pronunciationTitle")}
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate("/learned/meaning")}
          className="flex-1 flex flex-col items-center justify-center gap-3 active:bg-app-muted transition-colors"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: themeVars.iconBg }}
          >
            <BookOpen size={22} className="text-main-400" strokeWidth={1.8} />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-app-text leading-tight">
              {t("learned.meaningTitle")}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
