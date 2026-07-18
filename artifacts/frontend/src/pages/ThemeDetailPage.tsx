import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Eye, Pencil, Play, Plus, Trash2, X } from "lucide-react";
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
      <div className="bg-app-surface min-h-dvh">
        <LoadingPlaceholder padding="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-app-surface min-h-dvh p-8 text-center text-red-400">
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
        className="border-app-border-strong text-app-text-secondary inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold"
        title={t("themes.addWords")}
      >
        <Plus size={13} />
        <span className="hidden sm:inline">{t("themes.addWords")}</span>
      </button>
      <button
        type="button"
        onClick={() => navigate(`/themes/${themeId}/quiz/edit`)}
        className="border-app-border-strong text-app-text-secondary inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold"
        title={t("themeQuiz.edit")}
      >
        <Eye size={13} />
        <span className="hidden sm:inline">{t("themeQuiz.edit")}</span>
      </button>
      <button
        type="button"
        onClick={() => navigate(`/themes/${themeId}/quiz`)}
        disabled={theme.questions.length === 0}
        className="bg-main-500 inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
        title={t("themeQuiz.start")}
      >
        <Play size={13} />
        <span className="hidden sm:inline">{t("themeQuiz.start")}</span>
      </button>
    </>
  );

  return (
    <div className="bg-app-surface min-h-dvh">
      <div className="sm:border-app-border mx-auto max-w-2xl pb-8 sm:box-content sm:border-r-2 sm:border-l-2">
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
          className="bg-main-500 fixed right-6 bottom-6 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg sm:right-[max(1.5rem,calc(50%-20rem))]"
        >
          <Pencil size={18} />
          {t("themes.editTheme")}
        </button>
      </div>

      {showEdit && (
        <div
          ref={backdropRef}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={handleBackdropClick}
        >
          <div className="bg-app-surface border-app-border w-full rounded-t-2xl border p-5 shadow-xl sm:max-w-md sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-app-text text-lg font-bold">
                {t("themes.editTheme")}
              </h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="hover:bg-app-muted text-app-text-muted rounded-full p-1.5"
              >
                <X size={18} />
              </button>
            </div>
            <label className="text-app-text-muted mb-1.5 block text-xs font-semibold tracking-wider uppercase">
              {t("themes.nameLabel")}
            </label>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={t("themes.namePlaceholder")}
              className="border-app-border-strong bg-app-surface text-app-text focus:ring-main-300 mb-4 w-full rounded-xl border px-3 py-2.5 focus:ring-2 focus:outline-none"
            />
            <SvgIconField
              value={iconDraft}
              onChange={setIconDraft}
              namespace="themes"
            />
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="border-app-border-strong flex-1 rounded-xl border py-2.5 text-sm font-semibold"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={!nameDraft.trim() || isSaving}
                onClick={handleSave}
                className="bg-main-500 flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {t("common.update")}
              </button>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleDelete}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-950/30"
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
