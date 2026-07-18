import { useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Plus, X } from "lucide-react";
import { useLocation } from "wouter";
import { useThemes } from "../hooks/useThemes";
import { useWords } from "../hooks/useWords";
import { WordPickerModal } from "../components/WordPickerModal";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";
import { useTranslation } from "../i18n/I18nProvider";
import { CategoryTitle } from "../components/CategoryIcon";
import { SvgIconField } from "../components/SvgIconField";

export function ThemesHubPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { themes, isLoading, createTheme } = useThemes();
  const { words } = useWords();

  const [showCreate, setShowCreate] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [name, setName] = useState("");
  const [iconSvg, setIconSvg] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  function closeCreateModal() {
    setShowCreate(false);
    setName("");
    setIconSvg("");
    setSelectedIds(new Set());
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) closeCreateModal();
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const theme = await createTheme({
        name: name.trim(),
        wordIds: Array.from(selectedIds),
        iconSvg: iconSvg.trim() || null,
      });
      closeCreateModal();
      navigate(`/themes/${theme.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-app-bg min-h-dvh">
      <div className="sm:border-app-border mx-auto max-w-2xl sm:box-content sm:border-r-2 sm:border-l-2">
        <div className="bg-app-surface border-app-border border-b px-5 pt-4 pb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="text-app-text-muted hover:text-app-text-secondary -ml-1 flex items-center gap-1.5 p-1 transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-main-500 dark:text-main-600 text-[11px] font-semibold tracking-widest uppercase">
                {t("nav.themes")}
              </span>
            </button>
            {/* For pixel perfection */}
            <button className="text-app-text-muted hover:bg-app-muted invisible shrink-0 rounded-lg p-1.5 transition-colors disabled:opacity-30">
              <Plus size={17} />
            </button>
          </div>

          <h1 className="text-app-text mt-2 text-xl font-bold">
            {t("themes.title")}
          </h1>
          <p className="text-app-text-secondary mt-1 text-sm">
            {t("themes.subtitle")}
          </p>
        </div>

        <div className="space-y-3 px-5 py-4 pb-24">
          {isLoading ? (
            <LoadingPlaceholder padding="lg" />
          ) : themes.length === 0 ? (
            <p className="text-app-text-muted py-16 text-center text-sm">
              {t("themes.empty")}
            </p>
          ) : (
            themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => navigate(`/themes/${theme.id}`)}
                className="border-app-border bg-app-surface hover:border-main-300 flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <CategoryTitle
                    name={theme.name}
                    iconSvg={theme.iconSvg}
                    iconSize={22}
                    nameClassName="font-bold text-lg text-app-text truncate"
                  />
                  <p className="text-app-text-muted mt-0.5 text-xs">
                    {t("themes.meta", {
                      words: theme.wordCount,
                      questions: theme.questionCount,
                    })}
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  className="text-app-text-muted shrink-0"
                />
              </button>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="bg-main-500 fixed right-6 bottom-6 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg sm:right-[max(1.5rem,calc(50%-20rem))]"
        >
          <Plus size={18} />
          {t("themes.newTheme")}
        </button>
      </div>

      {showCreate && (
        <div
          ref={backdropRef}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={handleBackdropClick}
        >
          <div className="bg-app-surface border-app-border w-full rounded-t-2xl border p-5 shadow-xl sm:max-w-md sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-app-text text-lg font-bold">
                {t("themes.newTheme")}
              </h2>
              <button
                type="button"
                onClick={closeCreateModal}
                className="hover:bg-app-muted text-app-text-muted rounded-full p-1.5"
              >
                <X size={18} />
              </button>
            </div>
            <label className="text-app-text-muted mb-1.5 block text-xs font-semibold tracking-wider uppercase">
              {t("themes.nameLabel")}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("themes.namePlaceholder")}
              className="border-app-border-strong bg-app-surface text-app-text focus:ring-main-300 mb-3 w-full rounded-xl border px-3 py-2.5 focus:ring-2 focus:outline-none"
            />
            <SvgIconField
              value={iconSvg}
              onChange={setIconSvg}
              namespace="themes"
            />
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="border-app-border-strong text-app-text-secondary mb-4 w-full rounded-xl border border-dashed py-2.5 text-sm font-semibold"
            >
              {t("themes.pickWordsOptional")} ({selectedIds.size})
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeCreateModal}
                className="border-app-border-strong flex-1 rounded-xl border py-2.5 text-sm font-semibold"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={!name.trim() || saving}
                onClick={handleCreate}
                className="bg-main-500 flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {t("common.add")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPicker && (
        <WordPickerModal
          allWords={words}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
