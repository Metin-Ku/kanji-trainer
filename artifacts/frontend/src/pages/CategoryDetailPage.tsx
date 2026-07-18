import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  FileText,
  Languages,
  Pencil,
  Plus,
  Trash2,
  Waves,
  X,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useCategory } from "../hooks/useCategories";
import { useWords } from "../hooks/useWords";
import { WordListPanel } from "../components/WordListPanel";
import { WordPickerModal } from "../components/WordPickerModal";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";
import { useTranslation } from "../i18n/I18nProvider";
import { useConfirm } from "../components/ConfirmProvider";
import { CategoryIcon } from "../components/CategoryIcon";
import { CategoryIconField } from "../components/CategoryIconField";
import { fetchSrsQueue } from "../hooks/useSrs";
import { startSrsSession } from "../store/srsStore";
import { srsDeckLabel } from "../i18n/srsDeckLabels";
import { warmMobileKeyboard } from "../lib/mobileKeyboard";
import type { SrsDeckType } from "../types/srs";

const SRS_DECKS: {
  deck: SrsDeckType;
  Icon: typeof Languages;
}[] = [
  { deck: "word", Icon: Languages },
  { deck: "pronunciation", Icon: Waves },
  { deck: "meaning", Icon: BookOpen },
  { deck: "example", Icon: FileText },
];

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
    setCategoryWords,
    isSaving,
  } = useCategory(categoryId);

  const [showEdit, setShowEdit] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [iconDraft, setIconDraft] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [pickerIds, setPickerIds] = useState<Set<number>>(new Set());
  const [startingDeck, setStartingDeck] = useState<SrsDeckType | null>(null);
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

  async function handleAddWords() {
    if (!category) return;
    const nextIds = Array.from(pickerIds);
    await setCategoryWords(nextIds);
    setShowPicker(false);
    setPickerIds(new Set());
  }

  async function startCategorySrs(deck: SrsDeckType) {
    if (!category || category.wordIds.length === 0) {
      alert(t("categories.noWordsInCategory"));
      return;
    }
    if (deck === "example") warmMobileKeyboard();
    setStartingDeck(deck);
    try {
      const items = await fetchSrsQueue(deck, {
        wordIds: category.wordIds,
        sort: "due-asc",
      });
      if (items.length === 0) {
        alert(t("categories.noSrsCards"));
        return;
      }
      const label = srsDeckLabel(t, deck);
      startSrsSession(
        deck,
        items,
        t("categories.srsSessionTitle", {
          category: category.name,
          deck: label.title,
        }),
        `/categories/${categoryId}`,
        { jlptMin: null, jlptMax: null, sort: "due-asc" },
      );
      navigate("/srs/study");
    } finally {
      setStartingDeck(null);
    }
  }

  if (isLoading || !category) {
    return (
      <div className="bg-app-surface min-h-dvh">
        <LoadingPlaceholder padding="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-app-surface min-h-dvh p-8 text-center text-red-400">
        {t("categories.loadError")}
      </div>
    );
  }

  const toolbarExtra = (
    <>
      <button
        type="button"
        onClick={() => {
          setPickerIds(new Set(category.wordIds));
          setShowPicker(true);
        }}
        className="border-app-border-strong text-app-text-secondary inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold"
        title={t("categories.addWords")}
      >
        <Plus size={13} />
        <span className="hidden sm:inline">{t("categories.addWords")}</span>
      </button>
      {SRS_DECKS.map(({ deck, Icon }) => {
        const label = srsDeckLabel(t, deck);
        return (
          <button
            key={deck}
            type="button"
            disabled={
              startingDeck !== null || category.wordIds.length === 0
            }
            onPointerDown={() => {
              if (deck === "example") warmMobileKeyboard();
            }}
            onClick={() => void startCategorySrs(deck)}
            className="border-app-border-strong text-app-text-secondary inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold disabled:opacity-40"
            title={label.title}
          >
            <Icon size={13} strokeWidth={1.8} />
            <span className="hidden sm:inline">{label.title}</span>
          </button>
        );
      })}
    </>
  );

  return (
    <div className="bg-app-surface min-h-dvh">
      <div className="sm:border-app-border mx-auto max-w-2xl pb-8 sm:box-content sm:border-r-2 sm:border-l-2">
        <WordListPanel
          layout="page"
          pageTitle={category.name}
          pageTitleIcon={<CategoryIcon svg={category.iconSvg} size={14} />}
          onBack={() => navigate("/categories")}
          words={categoryWords}
          allWords={words}
          emptyMessage={t("categories.noWordsInCategory")}
          studyTitle={category.name}
          studyReturnPath={`/categories/${categoryId}`}
          onUpdate={updateWord}
          onDelete={deleteWord}
          toolbarExtra={toolbarExtra}
        />

        <button
          type="button"
          onClick={() => setShowEdit(true)}
          className="bg-main-500 fixed right-6 bottom-6 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg sm:right-[max(1.5rem,calc(50%-20rem))]"
        >
          <Pencil size={18} />
          {t("categories.editCategory")}
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
                {t("categories.editCategory")}
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
              {t("categories.nameLabel")}
            </label>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={t("categories.namePlaceholder")}
              className="border-app-border-strong bg-app-surface text-app-text focus:ring-main-300 mb-4 w-full rounded-xl border px-3 py-2.5 focus:ring-2 focus:outline-none"
            />
            <CategoryIconField value={iconDraft} onChange={setIconDraft} />
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
              {t("categories.deleteCategory")}
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
