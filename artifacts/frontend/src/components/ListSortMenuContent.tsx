import { useEffect, useState } from "react";
import { CheckSquare, Square, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "../i18n/I18nProvider";
import { JLPT_LEVELS } from "../types/srs";
import { toggleListSort, type SortOption } from "../lib/listSort";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

type SortGroup = { key: string; label: string };

type BaseProps<T extends string> = {
  menuOpen: boolean;
  sortOptions: SortOption<T>[];
  groups: SortGroup[];
  showJlptFilter?: boolean;
  selectedJlpt: Set<string>;
  onToggleJlpt: (level: string) => void;
  onClearJlpt: () => void;
  showPageSize?: boolean;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
};

type SingleSortProps<T extends string> = BaseProps<T> & {
  mode: "single";
  sort: T;
  onSortSelect: (value: T) => void;
};

type MultiSortProps<T extends string> = BaseProps<T> & {
  mode: "multi";
  activeSorts: Set<T>;
  onActiveSortsChange: (sorts: Set<T>) => void;
  multiSortHint?: string;
};

export type ListSortMenuContentProps<T extends string> =
  | SingleSortProps<T>
  | MultiSortProps<T>;

function JlptFilterSection({
  menuOpen,
  selectedJlpt,
  onToggleJlpt,
  onClearJlpt,
}: {
  menuOpen: boolean;
  selectedJlpt: Set<string>;
  onToggleJlpt: (level: string) => void;
  onClearJlpt: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const selectedJlptCount = selectedJlpt.size;

  useEffect(() => {
    if (!menuOpen) setExpanded(false);
  }, [menuOpen]);

  return (
    <>
      <div className="border-app-border mx-3 my-1.5 border-t" />
      <div className="px-3 pt-2.5 pb-1">
        <p className="text-app-text-muted text-[10px] font-bold tracking-widest uppercase">
          {t("words.filters.jlpt")}
        </p>
      </div>
      <button
        type="button"
        onClick={onClearJlpt}
        className="hover:bg-app-muted flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
      >
        {selectedJlptCount === 0 ? (
          <CheckSquare
            size={15}
            className="text-main-400 shrink-0"
            strokeWidth={2}
          />
        ) : (
          <Square
            size={15}
            className="text-app-text-muted shrink-0"
            strokeWidth={2}
          />
        )}
        <span
          className={
            selectedJlptCount === 0
              ? "text-app-text font-medium"
              : "text-app-text-secondary"
          }
        >
          {t("common.all")}
        </span>
      </button>
      {expanded &&
        JLPT_LEVELS.map((level) => {
          const active = selectedJlpt.has(level);
          return (
            <button
              key={level}
              type="button"
              onClick={() => onToggleJlpt(level)}
              className="hover:bg-app-muted flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
            >
              {active ? (
                <CheckSquare
                  size={15}
                  className="text-main-400 shrink-0"
                  strokeWidth={2}
                />
              ) : (
                <Square
                  size={15}
                  className="text-app-text-muted shrink-0"
                  strokeWidth={2}
                />
              )}
              <span
                className={
                  active
                    ? "text-app-text font-medium"
                    : "text-app-text-secondary"
                }
              >
                {level}
              </span>
            </button>
          );
        })}
      <button
        className="bg-app-surface border-app-border text-app-text-muted hover:bg-app-muted flex w-full items-center justify-center border-t py-0.5 border-b"
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={expanded ? t("common.close") : t("common.all")}
      >
        {expanded ? (
          <ChevronUp size={15} strokeWidth={2} />
        ) : (
          <ChevronDown size={15} strokeWidth={2} />
        )}
      </button>
    </>
  );
}

export function ListSortMenuContent<T extends string>(
  props: ListSortMenuContentProps<T>,
) {
  const { t } = useTranslation();
  const {
    menuOpen,
    sortOptions,
    groups,
    showJlptFilter = true,
    selectedJlpt,
    onToggleJlpt,
    onClearJlpt,
    showPageSize = false,
    pageSize,
    onPageSizeChange,
  } = props;

  const activeSortCount = props.mode === "multi" ? props.activeSorts.size : 0;

  return (
    <div className="bg-app-surface border-app-border absolute top-full right-0 z-50 mt-1.5 max-h-[min(70dvh,28rem)] w-56 overflow-y-auto rounded-xl border shadow-xl">
      {showPageSize && pageSize !== undefined && onPageSizeChange && (
        <>
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-app-text-muted text-[10px] font-bold tracking-widest uppercase">
              {t("words.filters.pageSize")}
            </p>
          </div>
          <div className="px-3 pb-2">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border-app-border-strong bg-app-muted text-app-text w-full rounded-lg border px-3 py-2 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {showJlptFilter && (
        <JlptFilterSection
          menuOpen={menuOpen}
          selectedJlpt={selectedJlpt}
          onToggleJlpt={onToggleJlpt}
          onClearJlpt={onClearJlpt}
        />
      )}

      {groups.map((group, gi) => (
        <div key={group.key}>
          {gi > 0 && <div className="border-app-border mx-3 my-1.5 border-t" />}
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-app-text-muted text-[10px] font-bold tracking-widest uppercase">
              {group.label}
            </p>
          </div>
          {sortOptions
            .filter((o) => o.group === group.key)
            .map((opt) => {
              const active =
                props.mode === "single"
                  ? props.sort === opt.value
                  : props.activeSorts.has(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (props.mode === "single") {
                      props.onSortSelect(opt.value);
                    } else {
                      props.onActiveSortsChange(
                        toggleListSort(
                          props.activeSorts,
                          opt.value,
                          sortOptions,
                        ),
                      );
                    }
                  }}
                  className="hover:bg-app-muted flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
                >
                  {active ? (
                    <CheckSquare
                      size={15}
                      className="text-main-400 shrink-0"
                      strokeWidth={2}
                    />
                  ) : (
                    <Square
                      size={15}
                      className="text-app-text-muted shrink-0"
                      strokeWidth={2}
                    />
                  )}
                  <span
                    className={
                      active
                        ? "text-app-text font-medium"
                        : "text-app-text-secondary"
                    }
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
        </div>
      ))}

      {props.mode === "multi" && activeSortCount > 1 && (
        <div className="bg-main-50 dark:bg-main-950 mx-3 mt-1.5 mb-2.5 rounded-lg px-2.5 py-1.5">
          <p className="text-main-400 text-[11px] font-medium">
            {props.multiSortHint ??
              t("words.sort.multiCriteria", { count: activeSortCount })}
          </p>
        </div>
      )}
      <div className="h-1" />
    </div>
  );
}
