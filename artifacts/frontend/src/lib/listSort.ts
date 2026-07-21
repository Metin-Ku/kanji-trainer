export type SortOption<T extends string> = {
  value: T;
  label: string;
  group: string;
};

export function toggleListSort<T extends string>(
  prev: Set<T>,
  value: T,
  sortOptions: SortOption<T>[],
): Set<T> {
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
