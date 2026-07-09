import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useCategory } from "../hooks/useCategories";
import { useWords } from "../hooks/useWords";
import { WordListPanel } from "../components/WordListPanel";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";
import { useTranslation } from "../i18n/I18nProvider";
import { useConfirm } from "../components/ConfirmProvider";
import { CategoryIcon } from "../components/CategoryIcon";
import { CategoryIconField } from "../components/CategoryIconField";

export function CategoryDetailPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/categories/:id");
  const categoryId = Number(params?.id);

  const { words, updateWord, deleteWord } = useWords();
  const {
    data: category,
    isLoading,
    isError,
    updateCategory,
    deleteCategory,
    isSaving,
  } = useCategory(categoryId);

  const [showEdit, setShowEdit] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [iconDraft, setIconDraft] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (category) {
      setNameDraft(category.name);
      setIconDraft(category.iconSvg ?? "");
    }
  }, [category]);

  const categoryWords = useMemo(() => {
    if (!category) return [];
    const map = new Map(words.map((w) => [w.id, w]));
    return category.wordIds
      .map((id) => map.get(id))
      .filter((w): w is NonNullable<typeof w> => !!w);
  }, [category, words]);

  function closeEditModal() {
    setShowEdit(false);
    if (category) {
      setNameDraft(category.name);
      setIconDraft(category.iconSvg ?? "");
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) closeEditModal();
  }

  async function handleSave() {
    if (!nameDraft.trim()) return;
    await updateCategory({
      name: nameDraft.trim(),
      iconSvg: iconDraft.trim() || null,
    });
    closeEditModal();
  }

  async function handleDelete() {
    if (!(await confirm(t("categories.confirmDelete")))) return;
    await deleteCategory();
    navigate("/categories");
  }

  if (isLoading || !category) {
    return (
      <div className="min-h-dvh bg-app-surface">
        <LoadingPlaceholder padding="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-dvh bg-app-surface p-8 text-center text-red-400">
        {t("categories.loadError")}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-app-surface">
      <div className="max-w-2xl mx-auto pb-8 sm:border-l sm:border-r sm:border-app-border">
        <WordListPanel
          layout="page"
          pageTitle={category.name}
          pageTitleIcon={
            <CategoryIcon svg={category.iconSvg} size={14} />
          }
          onBack={() => navigate("/categories")}
          words={categoryWords}
          allWords={words}
          emptyMessage={t("categories.noWordsInCategory")}
          studyTitle={category.name}
          studyReturnPath={`/categories/${categoryId}`}
          onUpdate={updateWord}
          onDelete={deleteWord}
        />

        <button
          type="button"
          onClick={() => setShowEdit(true)}
          className="fixed bottom-6 right-6 sm:right-[max(1.5rem,calc(50%-20rem))] z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-main-500 text-white shadow-lg font-semibold text-sm"
        >
          <Pencil size={18} />
          {t("categories.editCategory")}
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
                {t("categories.editCategory")}
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
              {t("categories.nameLabel")}
            </label>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={t("categories.namePlaceholder")}
              className="w-full rounded-xl border border-app-border-strong bg-app-surface px-3 py-2.5 text-app-text focus:outline-none focus:ring-2 focus:ring-main-300 mb-4"
            />
            <CategoryIconField value={iconDraft} onChange={setIconDraft} />
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
              {t("categories.deleteCategory")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
