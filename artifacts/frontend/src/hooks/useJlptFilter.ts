import { useState } from "react";

export function useJlptFilter(initialLevels: string[] = []) {
  const [selectedJlpt, setSelectedJlpt] = useState<Set<string>>(
    () => new Set(initialLevels),
  );

  function toggleJlpt(level: string) {
    setSelectedJlpt((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  function clearJlpt() {
    setSelectedJlpt(new Set());
  }

  return {
    selectedJlpt,
    toggleJlpt,
    clearJlpt,
  };
}
