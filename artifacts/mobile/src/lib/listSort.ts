import type { SortMode } from "./sortWords";

export type SortOption = {
  value: SortMode;
  label: string;
  group: string;
};

export function toggleListSort(
  prev: Set<SortMode>,
  value: SortMode,
  sortOptions: SortOption[],
): Set<SortMode> {
  const next = new Set(prev);
  const opt = sortOptions.find((o) => o.value === value)!;
  const others = sortOptions
    .filter((o) => o.group === opt.group && o.value !== value)
    .map((o) => o.value);
  if (next.has(value)) {
    next.delete(value);
  } else {
    others.forEach((o) => next.delete(o));
    next.add(value);
  }
  return next;
}
