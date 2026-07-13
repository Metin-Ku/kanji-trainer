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
    <div className="min-h-dvh bg-app-bg">
      <div className="max-w-2xl mx-auto sm:border-l sm:border-r sm:border-app-border">
        <div className="bg-app-surface border-b border-app-border px-5 pt-4 pb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted hover:text-app-text-secondary transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-[11px] font-semibold text-main-500 dark:text-main-600 uppercase tracking-widest">
                {t("nav.themes")}
              </span>
            </button>
            {/* For pixel perfection */}
            <button className="invisible p-1.5 rounded-lg text-app-text-muted hover:bg-app-muted transition-colors disabled:opacity-30 shrink-0">
              <Plus size={17} />
            </button>
          </div>

          <h1 className="text-xl font-bold text-app-text mt-2">
            {t("themes.title")}
          </h1>
          <p className="text-sm text-app-text-secondary mt-1">
            {t("themes.subtitle")}
          </p>
        </div>

        <div className="px-5 py-4 space-y-3 pb-24">
          {isLoading ? (
            <LoadingPlaceholder padding="lg" />
          ) : themes.length === 0 ? (
            <p className="text-sm text-app-text-muted text-center py-16">
              {t("themes.empty")}
            </p>
          ) : (
            themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => navigate(`/themes/${theme.id}`)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border border-app-border bg-app-surface hover:border-main-300 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <CategoryTitle
                    name={theme.name}
                    iconSvg={theme.iconSvg}
                    iconSize={22}
                    nameClassName="font-bold text-lg text-app-text truncate"
                  />
                  <p className="text-xs text-app-text-muted mt-0.5">
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
          className="fixed bottom-6 right-6 sm:right-[max(1.5rem,calc(50%-20rem))] z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-main-500 text-white shadow-lg font-semibold text-sm"
        >
          <Plus size={18} />
          {t("themes.newTheme")}
        </button>
      </div>

      {showCreate && (
        <div
          ref={backdropRef}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={handleBackdropClick}
        >
          <div className="bg-app-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-app-border p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-app-text">
                {t("themes.newTheme")}
              </h2>
              <button
                type="button"
                onClick={closeCreateModal}
                className="p-1.5 rounded-full hover:bg-app-muted text-app-text-muted"
              >
                <X size={18} />
              </button>
            </div>
            <label className="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">
              {t("themes.nameLabel")}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("themes.namePlaceholder")}
              className="w-full rounded-xl border border-app-border-strong bg-app-surface px-3 py-2.5 text-app-text focus:outline-none focus:ring-2 focus:ring-main-300 mb-3"
            />
            <SvgIconField
              value={iconSvg}
              onChange={setIconSvg}
              namespace="themes"
            />
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-app-border-strong text-sm font-semibold text-app-text-secondary mb-4"
            >
              {t("themes.pickWordsOptional")} ({selectedIds.size})
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeCreateModal}
                className="flex-1 py-2.5 rounded-xl border border-app-border-strong text-sm font-semibold"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={!name.trim() || saving}
                onClick={handleCreate}
                className="flex-1 py-2.5 rounded-xl bg-main-500 text-white text-sm font-semibold disabled:opacity-40"
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
