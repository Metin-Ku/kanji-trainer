import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  LayoutGrid,
  LayoutList,
  Plus,
  Rows3,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { useCategories } from "../hooks/useCategories";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";
import { useTranslation } from "../i18n/I18nProvider";
import {
  getCategoryViewLayout,
  setCategoryViewLayout,
  type CategoryViewLayout,
} from "../lib/categoryView";
import { CategoryTitle } from "../components/CategoryIcon";
import { CategoryIconField } from "../components/CategoryIconField";

function CategoryCard({
  name,
  iconSvg,
  wordCountLabel,
  onClick,
}: {
  name: string;
  iconSvg?: string | null;
  wordCount: number;
  wordCountLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-2xl border border-app-border bg-app-surface hover:border-main-300 transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <CategoryTitle
          name={name}
          iconSvg={iconSvg}
          iconSize={22}
          nameClassName="font-bold text-lg text-app-text leading-snug"
        />
        <p className="text-xs text-app-text-muted mt-0.5">{wordCountLabel}</p>
      </div>
      <ChevronRight size={18} className="text-app-text-muted shrink-0" />
    </button>
  );
}

const LAYOUT_OPTIONS: {
  value: CategoryViewLayout;
  icon: typeof LayoutList;
  labelKey: "row" | "grid2" | "grid3";
}[] = [
  { value: "row", icon: LayoutList, labelKey: "row" },
  { value: "grid-2", icon: Rows3, labelKey: "grid2" },
  { value: "grid-3", icon: LayoutGrid, labelKey: "grid3" },
];

export function CategoriesHubPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { data: categories = [], isLoading, createCategory } = useCategories();
  const [layout, setLayout] = useState<CategoryViewLayout>(getCategoryViewLayout);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [iconSvg, setIconSvg] = useState("");
  const [saving, setSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCategoryViewLayout(layout);
  }, [layout]);

  function closeCreateModal() {
    setShowCreate(false);
    setName("");
    setIconSvg("");
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) closeCreateModal();
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const category = await createCategory({
        name: name.trim(),
        iconSvg: iconSvg.trim() || null,
      });
      closeCreateModal();
      navigate(`/categories/${category.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-app-bg">
      <div className="max-w-2xl mx-auto sm:border-l sm:border-r sm:border-app-border">
        <div className="bg-app-surface border-b border-app-border px-5 pt-4 pb-4">
          <div className="flex items-center justify-between gap-3 h-[29px]">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted hover:text-app-text-secondary transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-[11px] font-semibold text-main-500 dark:text-main-600 uppercase tracking-widest">
                {t("nav.categories")}
              </span>
            </button>
            <div className="flex items-center gap-1 rounded-xl border border-app-border bg-app-muted p-0.5">
              {LAYOUT_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  title={t(`categories.view.${labelKey}`)}
                  onClick={() => setLayout(value)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    layout === value
                      ? "bg-app-surface text-main-500 dark:text-main-600 shadow-sm"
                      : "text-app-text-muted hover:text-app-text-secondary"
                  }`}
                >
                  <Icon size={16} strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>
          <h1 className="text-xl font-bold text-app-text mt-2">
            {t("categories.title")}
          </h1>
          <p className="text-sm text-app-text-secondary mt-1">
            {t("categories.subtitle")}
          </p>
        </div>

        <div
          className={`px-5 py-4 pb-24 ${
            layout === "row"
              ? "space-y-3"
              : layout === "grid-2"
                ? "grid grid-cols-2 gap-3"
                : "grid grid-cols-3 gap-2"
          }`}
        >
          {isLoading ? (
            <div className={layout === "row" ? "" : "col-span-full"}>
              <LoadingPlaceholder padding="lg" />
            </div>
          ) : categories.length === 0 ? (
            <p
              className={`text-sm text-app-text-muted text-center py-16 ${
                layout === "row" ? "" : "col-span-full"
              }`}
            >
              {t("categories.empty")}
            </p>
          ) : (
            categories.map((category) => {
              const wordCountLabel = t("categories.wordCount", {
                count: category.wordCount,
              });
              const onClick = () => navigate(`/categories/${category.id}`);

              if (layout === "row") {
                return (
                  <CategoryCard
                    key={category.id}
                    name={category.name}
                    iconSvg={category.iconSvg}
                    wordCount={category.wordCount}
                    wordCountLabel={wordCountLabel}
                    onClick={onClick}
                  />
                );
              }

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={onClick}
                  className="flex flex-col gap-2 p-3 sm:p-4 rounded-2xl border border-app-border bg-app-surface hover:border-main-300 transition-colors text-left min-h-[88px]"
                >
                  <CategoryTitle
                    name={category.name}
                    iconSvg={category.iconSvg}
                    iconSize={layout === "grid-3" ? 16 : 18}
                    nameClassName={`font-bold text-app-text leading-snug ${
                      layout === "grid-3" ? "text-sm" : "text-base"
                    }`}
                  />
                  <p className="text-[11px] text-app-text-muted mt-auto">
                    {wordCountLabel}
                  </p>
                </button>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="fixed bottom-6 right-6 sm:right-[max(1.5rem,calc(50%-20rem))] z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-main-500 text-white shadow-lg font-semibold text-sm"
        >
          <Plus size={18} />
          {t("categories.newCategory")}
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
                {t("categories.newCategory")}
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
              {t("categories.nameLabel")}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("categories.namePlaceholder")}
              className="w-full rounded-xl border border-app-border-strong bg-app-surface px-3 py-2.5 text-app-text focus:outline-none focus:ring-2 focus:ring-main-300 mb-4"
            />
            <CategoryIconField value={iconSvg} onChange={setIconSvg} />
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
    </div>
  );
}
