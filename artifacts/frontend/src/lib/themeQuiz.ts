import type { SrsExampleHint, ThemeQuizQuestion, ThemeQuizQuestionType } from "../types";

export function sanitizeHints(hints: SrsExampleHint[]): SrsExampleHint[] {
  return hints.map((h) => {
    const text = h.text.trim();
    const highlights = (h.highlights ?? [])
      .map((x) => x.trim())
      .filter((x) => x && text.includes(x));
    return highlights.length ? { text, highlights } : { text };
  });
}

const AB_KEYS = ["a", "b"] as const;
const FOUR_KEYS = ["1", "2", "3", "4"] as const;

export function defaultChoices(type: ThemeQuizQuestionType) {
  const keys = type === "ab" ? AB_KEYS : FOUR_KEYS;
  return keys.map((key) => ({ key, label: "" }));
}

export function emptyQuestion(
  sortOrder: number,
  type: ThemeQuizQuestionType = "ab",
): ThemeQuizQuestion {
  return {
    sortOrder,
    type,
    prompt: "",
    choices: defaultChoices(type),
    correctKey: type === "ab" ? "a" : "1",
    hints: [{ text: "" }],
  };
}

export function sanitizeThemeQuestions(
  questions: ThemeQuizQuestion[],
): Omit<ThemeQuizQuestion, "id">[] {
  return questions.map((q, index) => {
    const type: ThemeQuizQuestionType = q.type === "four" ? "four" : "ab";
    const keys = type === "ab" ? AB_KEYS : FOUR_KEYS;
    const choices = keys.map((key) => {
      const found = q.choices.find((c) => c.key === key);
      return { key, label: (found?.label ?? "").trim() };
    });
    const correctKey = (keys as readonly string[]).includes(q.correctKey)
      ? q.correctKey
      : keys[0]!;
    return {
      sortOrder: q.sortOrder ?? index,
      type,
      prompt: q.prompt.trim(),
      choices,
      correctKey,
      hints: sanitizeHints(q.hints ?? []),
    };
  });
}
