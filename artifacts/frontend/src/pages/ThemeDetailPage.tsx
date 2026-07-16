import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useTheme } from "../hooks/useThemes";
import { useWords } from "../hooks/useWords";
import { WordListPanel } from "../components/WordListPanel";
import { WordPickerModal } from "../components/WordPickerModal";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";
import { useTranslation } from "../i18n/I18nProvider";
import { useConfirm } from "../components/ConfirmProvider";
import { CategoryIcon } from "../components/CategoryIcon";
import { SvgIconField } from "../components/SvgIconField";

export function ThemeDetailPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
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
    isSaving,
  } = useTheme(themeId);

  const [showEdit, setShowEdit] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [iconDraft, setIconDraft] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [pickerIds, setPickerIds] = useState<Set<number>>(new Set());
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (theme) {
      setNameDraft(theme.name);
      setIconDraft(theme.iconSvg ?? "");
    }
  }, [theme]);

  const themeWords = useMemo(() => {
    if (!theme) return [];
    const map = new Map(words.map((w) => [w.id, w]));
    return theme.wordIds
      .map((id) => map.get(id))
      .filter((w): w is NonNullable<typeof w> => !!w);
  }, [theme, words]);

  function closeEditModal() {
    setShowEdit(false);
    if (theme) {
      setNameDraft(theme.name);
      setIconDraft(theme.iconSvg ?? "");
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) closeEditModal();
  }

  async function handleSave() {
    if (!nameDraft.trim()) return;
    await updateTheme({
      name: nameDraft.trim(),
      iconSvg: iconDraft.trim() || null,
    });
    closeEditModal();
  }

  async function handleDelete() {
    if (!(await confirm(t("themes.confirmDelete")))) return;
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

  const toolbarExtra = (
    <>
      <button
        type="button"
        onClick={() => {
          setPickerIds(new Set(theme.wordIds));
          setShowPicker(true);
        }}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-app-border-strong text-[11px] font-semibold text-app-text-secondary shrink-0"
        title={t("themes.addWords")}
      >
        <Plus size={13} />
        <span className="hidden sm:inline">{t("themes.addWords")}</span>
      </button>
      <button
        type="button"
        onClick={() => navigate(`/themes/${themeId}/quiz/edit`)}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-app-border-strong text-[11px] font-semibold text-app-text-secondary shrink-0"
        title={t("themeQuiz.edit")}
      >
        <BookOpen size={13} />
        <span className="hidden sm:inline">{t("themeQuiz.edit")}</span>
      </button>
      <button
        type="button"
        onClick={() => navigate(`/themes/${themeId}/quiz`)}
        disabled={theme.questions.length === 0}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-main-500 text-white text-[11px] font-semibold disabled:opacity-40 shrink-0"
        title={t("themeQuiz.start")}
      >
        <Play size={13} />
        <span className="hidden sm:inline">{t("themeQuiz.start")}</span>
      </button>
    </>
  );

  return (
    <div className="min-h-dvh bg-app-surface">
      <div className="max-w-2xl mx-auto pb-8 sm:box-content sm:border-l-2 sm:border-r-2 sm:border-app-border">
        <WordListPanel
          layout="page"
          pageTitle={theme.name}
          pageTitleIcon={<CategoryIcon svg={theme.iconSvg} size={14} />}
          onBack={() => navigate("/themes")}
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
          toolbarExtra={toolbarExtra}
        />

        <button
          type="button"
          onClick={() => setShowEdit(true)}
          className="fixed bottom-6 right-6 sm:right-[max(1.5rem,calc(50%-20rem))] z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-main-500 text-white shadow-lg font-semibold text-sm"
        >
          <Pencil size={18} />
          {t("themes.editTheme")}
        </button>
      </div>

      {showEdit && (
        <div
          ref={backdropRef}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={handleBackdropClick}
        >
          <div className="bg-app-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-app-border p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-app-text">
                {t("themes.editTheme")}
              </h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="p-1.5 rounded-full hover:bg-app-muted text-app-text-muted"
              >
                <X size={18} />
              </button>
            </div>
            <label className="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">
              {t("themes.nameLabel")}
            </label>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={t("themes.namePlaceholder")}
              className="w-full rounded-xl border border-app-border-strong bg-app-surface px-3 py-2.5 text-app-text focus:outline-none focus:ring-2 focus:ring-main-300 mb-4"
            />
            <SvgIconField
              value={iconDraft}
              onChange={setIconDraft}
              namespace="themes"
            />
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={closeEditModal}
                className="flex-1 py-2.5 rounded-xl border border-app-border-strong text-sm font-semibold"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={!nameDraft.trim() || isSaving}
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-main-500 text-white text-sm font-semibold disabled:opacity-40"
              >
                {t("common.update")}
              </button>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleDelete}
              className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              {t("themes.deleteTheme")}
            </button>
          </div>
        </div>
      )}

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
