import { useEffect, useState } from "react";
import { readPinnedIds, writePinnedIds } from "../lib/pinnedWords";

export function usePinnedWords(scope: string) {
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(
    () => new Set(readPinnedIds(scope)),
  );

  useEffect(() => {
    writePinnedIds(scope, [...pinnedIds]);
  }, [scope, pinnedIds]);

  function togglePinMany(ids: number[]) {
    if (ids.length === 0) return;
    setPinnedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  return {
    pinnedIds,
    togglePinMany,
    isPinned: (id: number) => pinnedIds.has(id),
  };
}
