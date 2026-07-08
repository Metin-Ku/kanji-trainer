import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useTheme } from "../hooks/useThemes";
import { useWords } from "../hooks/useWords";
import { WordListPanel } from "../components/WordListPanel";
import { WordPickerModal } from "../components/WordPickerModal";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";
import { useTranslation } from "../i18n/I18nProvider";

export function ThemeDetailPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/themes/:id");
  const themeId = Number(params?.id);

  const { words, updateWord, deleteWord } = useWords();
  const {
    theme,
    isLoading,
    isError,
    updateTheme,
    deleteTheme,
    addThemeWords,
    removeThemeWord,
  } = useTheme(themeId);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [pickerIds, setPickerIds] = useState<Set<number>>(new Set());

  const themeWords = useMemo(() => {
    if (!theme) return [];
    const map = new Map(words.map((w) => [w.id, w]));
    return theme.wordIds
      .map((id) => map.get(id))
      .filter((w): w is NonNullable<typeof w> => !!w);
  }, [theme, words]);

  async function saveName() {
    if (!theme || !nameDraft.trim()) return;
    await updateTheme({ name: nameDraft.trim() });
    setEditingName(false);
  }

  async function handleDeleteTheme() {
    if (!window.confirm(t("themes.confirmDelete"))) return;
    await deleteTheme();
    navigate("/themes");
  }

  async function handleAddWords() {
    const newIds = Array.from(pickerIds).filter(
      (id) => !theme?.wordIds.includes(id),
    );
    if (newIds.length > 0) await addThemeWords(newIds);
    setShowPicker(false);
    setPickerIds(new Set());
  }

  async function handleBulkRemove(ids: number[]) {
    await Promise.all(ids.map((wordId) => removeThemeWord(wordId)));
  }

  if (isLoading || !theme) {
    return (
      <div className="min-h-dvh bg-app-surface">
        <LoadingPlaceholder padding="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-dvh bg-app-surface p-8 text-center text-red-400">
        {t("themes.loadError")}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-app-surface">
      <div className="max-w-2xl mx-auto pb-28 sm:border-l sm:border-r sm:border-app-border">
        <div className="sticky top-0 z-10 bg-app-surface border-b border-app-border px-5 pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/themes")}
              className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted hover:text-app-text-secondary"
            >
              <ArrowLeft size={18} />
              <span className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">
                {t("nav.themes")}
              </span>
            </button>
            <button
              type="button"
              onClick={handleDeleteTheme}
              className="p-1.5 rounded-lg text-app-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 size={17} />
            </button>
          </div>

          {editingName ? (
            <div className="flex gap-2">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="flex-1 rounded-xl border border-app-border-strong px-3 py-2 text-lg font-bold"
              />
              <button
                type="button"
                onClick={saveName}
                className="px-3 py-2 rounded-xl bg-main-500 text-white text-sm font-semibold"
              >
                {t("common.update")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-app-text flex-1">{theme.name}</h1>
              <button
                type="button"
                onClick={() => {
                  setNameDraft(theme.name);
                  setEditingName(true);
                }}
                className="p-1.5 rounded-lg text-app-text-muted hover:bg-app-muted"
              >
                <Pencil size={16} />
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setPickerIds(new Set(theme.wordIds));
                setShowPicker(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-app-border-strong text-xs font-semibold text-app-text-secondary"
            >
              <Plus size={14} />
              {t("themes.addWords")}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/themes/${themeId}/quiz/edit`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-app-border-strong text-xs font-semibold text-app-text-secondary"
            >
              <BookOpen size={14} />
              {t("themeQuiz.edit")}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/themes/${themeId}/quiz`)}
              disabled={theme.questions.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-main-500 text-white text-xs font-semibold disabled:opacity-40"
            >
              <Play size={14} />
              {t("themeQuiz.start")}
            </button>
          </div>
        </div>

        <div className="px-5 pt-2">
          <WordListPanel
            words={themeWords}
            allWords={words}
            emptyMessage={t("themes.noWords")}
            studyTitle={t("themes.studyTitle", { name: theme.name })}
            studyReturnPath={`/themes/${themeId}`}
            onUpdate={updateWord}
            onDelete={deleteWord}
            bulkMode="remove"
            onBulkRemove={handleBulkRemove}
            bulkRemoveLabel={t("themes.removeFromTheme")}
          />
        </div>
      </div>

      {showPicker && (
        <WordPickerModal
          allWords={words}
          selectedIds={pickerIds}
          onChange={setPickerIds}
          onClose={() => setShowPicker(false)}
          onConfirm={async () => {
            await handleAddWords();
            setShowPicker(false);
          }}
        />
      )}
    </div>
  );
}
