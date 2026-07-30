import { useCallback, useEffect, useState } from "react";
import { readPinnedIds, writePinnedIds } from "@/lib/pinnedWords";

export function usePinnedWords(scope: string) {
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(() => new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readPinnedIds(scope).then((ids) => {
      if (!cancelled) {
        setPinnedIds(new Set(ids));
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  useEffect(() => {
    if (!ready) return;
    void writePinnedIds(scope, [...pinnedIds]);
  }, [scope, pinnedIds, ready]);

  const togglePinMany = useCallback((ids: number[]) => {
    if (ids.length === 0) return;
    setPinnedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  return {
    pinnedIds,
    togglePinMany,
    isPinned: (id: number) => pinnedIds.has(id),
    ready,
  };
}
