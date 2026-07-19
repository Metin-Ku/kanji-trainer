import { useEffect, useMemo, useRef, useState } from "react";
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
import { SearchBar } from "../components/SearchBar";
import { useTranslation } from "../i18n/I18nProvider";
import {
  getCategoryViewLayout,
  setCategoryViewLayout,
  type CategoryViewLayout,
} from "../lib/categoryView";
import { normalizeCategoryLabel } from "../lib/categoryMatch";
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
      className="border-app-border bg-app-surface hover:border-main-300 flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors"
    >
      <div className="min-w-0 flex-1">
        <CategoryTitle
          name={name}
          iconSvg={iconSvg}
          iconSize={22}
          nameClassName="font-bold text-lg text-app-text leading-snug"
        />
        <p className="text-app-text-muted mt-0.5 text-xs">{wordCountLabel}</p>
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
  const [layout, setLayout] = useState<CategoryViewLayout>(
    getCategoryViewLayout,
  );
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [iconSvg, setIconSvg] = useState("");
  const [saving, setSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCategoryViewLayout(layout);
  }, [layout]);

  const filtered = useMemo(() => {
    const q = normalizeCategoryLabel(query);
    if (!q) return categories;
    return categories.filter((c) =>
      normalizeCategoryLabel(c.name).includes(q),
    );
  }, [categories, query]);

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
    <div className="bg-app-bg min-h-dvh">
      <div className="sm:border-app-border mx-auto max-w-2xl sm:box-content sm:border-r-2 sm:border-l-2">
        <div className="bg-app-surface border-app-border border-b px-5 pt-4 pb-4">
          <div className="flex h-[29px] items-center justify-between gap-3">
            <button
              onClick={() => navigate("/")}
              className="text-app-text-muted hover:text-app-text-secondary -ml-1 flex items-center gap-1.5 p-1 transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-main-400 dark:text-main-500 text-[11px] font-semibold tracking-widest uppercase">
                {t("nav.categories")}
              </span>
            </button>
            <div className="border-app-border bg-app-muted flex items-center gap-1 rounded-xl border p-0.5">
              {LAYOUT_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  title={t(`categories.view.${labelKey}`)}
                  onClick={() => setLayout(value)}
                  className={`rounded-lg p-1.5 transition-colors ${
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
          <h1 className="text-app-text mt-2 text-xl font-bold">
            {t("categories.title")}
          </h1>
          <p className="text-app-text-secondary mt-1 mb-3 text-sm">
            {t("categories.subtitle")}
          </p>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder={t("categories.searchPlaceholder")}
          />
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
              className={`text-app-text-muted py-16 text-center text-sm ${
                layout === "row" ? "" : "col-span-full"
              }`}
            >
              {t("categories.empty")}
            </p>
          ) : filtered.length === 0 ? (
            <p
              className={`text-app-text-muted py-16 text-center text-sm ${
                layout === "row" ? "" : "col-span-full"
              }`}
            >
              {t("categories.selectNotFound", { query })}
            </p>
          ) : (
            filtered.map((category) => {
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
                  className="border-app-border bg-app-surface hover:border-main-300 flex min-h-[88px] flex-col gap-2 rounded-2xl border p-3 text-left transition-colors sm:p-4"
                >
                  <CategoryTitle
                    name={category.name}
                    iconSvg={category.iconSvg}
                    iconSize={layout === "grid-3" ? 16 : 18}
                    nameClassName={`font-bold text-app-text leading-snug ${
                      layout === "grid-3" ? "text-sm" : "text-base"
                    }`}
                  />
                  <p className="text-app-text-muted mt-auto text-[11px]">
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
          className="bg-main-500 fixed right-6 bottom-6 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg sm:right-[max(1.5rem,calc(50%-20rem))]"
        >
          <Plus size={18} />
          {t("categories.newCategory")}
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
                {t("categories.newCategory")}
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
              {t("categories.nameLabel")}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("categories.namePlaceholder")}
              className="border-app-border-strong bg-app-surface text-app-text focus:ring-main-300 mb-4 w-full rounded-xl border px-3 py-2.5 focus:ring-2 focus:outline-none"
            />
            <CategoryIconField value={iconSvg} onChange={setIconSvg} />
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
    </div>
  );
}
