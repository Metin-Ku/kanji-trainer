import { useRef, useState, useEffect } from "react";
import { X, BookOpen, Languages, Waves } from "lucide-react";
import { Word, SrsExample } from "../types";
import { RelatedWordsSelect } from "./RelatedWordsSelect";
import { CategoriesSelect } from "./CategoriesSelect";
import { SrsExamplesEditor } from "./SrsExamplesEditor";
import {
  sanitizeSrsExamples,
  srsExamplesToPlainDescription,
} from "../lib/srsExamples";
import { useTranslation } from "../i18n/I18nProvider";
import { useCategories } from "../hooks/useCategories";
import { themeVars } from "../theme";

interface SaveData {
  kanji: string;
  pronunciation: string;
  meaning: string;
  description: string;
  srsExamples: SrsExample[];
  level: number;
  starred: boolean;
  pronLevel: number;
  pronStarred: boolean;
  meaningLevel: number;
  meaningStarred: boolean;
  jlptLevel: string | null;
  date: string;
  relatedWordIds: number[];
  categoryIds: number[];
}

interface Props {
  initial?: Word;
  allWords?: Word[];
  onSave: (data: SaveData) => void;
  onClose: () => void;
}

function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

type TabId = "general" | "srs";
type LevelField = "word" | "pronunciation" | "meaning";

const LEVEL_ROWS: {
  key: LevelField;
  labelKey:
    | "wordForm.labels.word"
    | "wordForm.labels.pronunciation"
    | "wordForm.labels.meaning";
  Icon: typeof Languages;
}[] = [
  { key: "word", labelKey: "wordForm.labels.word", Icon: Languages },
  {
    key: "pronunciation",
    labelKey: "wordForm.labels.pronunciation",
    Icon: Waves,
  },
  { key: "meaning", labelKey: "wordForm.labels.meaning", Icon: BookOpen },
];

export function WordFormModal({
  initial,
  allWords = [],
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const { data: categories = [] } = useCategories();
  const [tab, setTab] = useState<TabId>("general");
  const [kanji, setKanji] = useState(initial?.kanji ?? "");
  const [pronunciation, setPronunciation] = useState(
    initial?.pronunciation ?? "",
  );
  const [meaning, setMeaning] = useState(initial?.meaning ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [srsExamples, setSrsExamples] = useState<SrsExample[]>(
    initial?.srsExamples ?? [],
  );
  const [level, setLevel] = useState(initial?.level ?? 1);
  const [pronLevel, setPronLevel] = useState(initial?.pronLevel ?? 1);
  const [meaningLevel, setMeaningLevel] = useState(initial?.meaningLevel ?? 1);
  const [starred, setStarred] = useState(initial?.starred ?? false);
  const [pronStarred, setPronStarred] = useState(initial?.pronStarred ?? false);
  const [meaningStarred, setMeaningStarred] = useState(
    initial?.meaningStarred ?? false,
  );
  const [jlptLevel, setJlptLevel] = useState<string | null>(
    initial?.jlptLevel ?? null,
  );
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [relatedWordIds, setRelatedWordIds] = useState<number[]>(
    initial?.relatedWordIds ?? [],
  );
  const [categoryIds, setCategoryIds] = useState<number[]>(
    initial?.categoryIds ?? [],
  );
  const [openLevelField, setOpenLevelField] = useState<LevelField | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const levelPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openLevelField) return;
    function handler(e: MouseEvent | TouchEvent) {
      if (
        levelPickerRef.current &&
        !levelPickerRef.current.contains(e.target as Node)
      ) {
        setOpenLevelField(null);
      }
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [openLevelField]);

  function getLevelState(field: LevelField) {
    switch (field) {
      case "word":
        return { level, starred };
      case "pronunciation":
        return { level: pronLevel, starred: pronStarred };
      case "meaning":
        return { level: meaningLevel, starred: meaningStarred };
    }
  }

  function applyLevelState(
    field: LevelField,
    nextLevel: number,
    nextStarred: boolean,
  ) {
    switch (field) {
      case "word":
        setLevel(nextLevel);
        setStarred(nextStarred);
        break;
      case "pronunciation":
        setPronLevel(nextLevel);
        setPronStarred(nextStarred);
        break;
      case "meaning":
        setMeaningLevel(nextLevel);
        setMeaningStarred(nextStarred);
        break;
    }
  }

  function renderLevelIndicator(levelValue: number, isStarred: boolean) {
    if (isStarred) {
      return (
        <div
          className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
          style={{
            background: themeVars.star,
            color: "rgb(255,255,255)",
          }}
        >
          ★
        </div>
      );
    }
    return (
      <div
        className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
        style={{ background: themeVars.level(levelValue) }}
      >
        {levelValue}
      </div>
    );
  }

  function renderLevelPicker(field: LevelField) {
    const { level: pickLevel, starred: pickStarred } = getLevelState(field);
    const starEnabled = pickLevel === 5 || pickStarred;

    return (
      <div
        className="ml-auto flex shrink-0 items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {[1, 2, 3, 4, 5].map((l) => {
          const active = pickLevel === l && !pickStarred;
          const color = themeVars.level(l);
          return (
            <button
              key={l}
              type="button"
              onClick={() => {
                applyLevelState(field, l, false);
                setOpenLevelField(null);
              }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
              style={{
                background: active ? color : "transparent",
                boxShadow: active ? "none" : `inset 0 0 0 2px ${color}`,
                color: active ? "white" : color,
              }}
            >
              {l}
            </button>
          );
        })}
        <button
          type="button"
          disabled={!starEnabled}
          onClick={() => {
            if (!starEnabled) return;
            applyLevelState(field, 5, !pickStarred);
            setOpenLevelField(null);
          }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
          style={{
            background: pickStarred ? themeVars.star : "transparent",
            boxShadow: pickStarred
              ? "none"
              : `inset 0 0 0 2px ${starEnabled ? themeVars.star : "#e5e7eb"}`,
            color: pickStarred
              ? "white"
              : starEnabled
                ? themeVars.star
                : "#d1d5db",
            cursor: starEnabled ? "pointer" : "not-allowed",
            opacity: starEnabled ? 1 : 0.4,
          }}
          aria-label={
            pickStarred ? t("a11y.unmarkLearned") : t("a11y.markLearned")
          }
        >
          ★
        </button>
      </div>
    );
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) onClose();
  }

  function syncDescriptionFromSrs() {
    const next = srsExamplesToPlainDescription(srsExamples);
    if (!next) return;
    if (
      description.trim() &&
      !confirm(t("wordForm.confirmRegenerateDescription"))
    )
      return;
    setDescription(next);
    setTab("general");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!kanji.trim()) return;
    onSave({
      kanji: kanji.trim(),
      pronunciation,
      meaning,
      description,
      srsExamples: sanitizeSrsExamples(srsExamples),
      level,
      starred,
      pronLevel,
      pronStarred,
      meaningLevel,
      meaningStarred,
      jlptLevel,
      date,
      relatedWordIds,
      categoryIds,
    });
    onClose();
  }

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="modal-sheet flex max-h-[90vh] flex-col">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 className="text-app-text text-lg font-bold">
            {initial ? t("wordForm.editTitle") : t("wordForm.addTitle")}
          </h2>
          <button
            onClick={onClose}
            className="hover:bg-app-muted text-app-text-muted rounded-full p-1.5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bg-app-muted mb-4 flex shrink-0 gap-1 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setTab("general")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === "general"
                ? "bg-app-surface text-app-text shadow-sm"
                : "text-app-text-secondary hover:text-app-text"
            }`}
          >
            {t("wordForm.tabs.general")}
          </button>
          <button
            type="button"
            onClick={() => setTab("srs")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === "srs"
                ? "bg-app-surface text-app-text shadow-sm"
                : "text-app-text-secondary hover:text-app-text"
            }`}
          >
            {t("wordForm.tabs.srsExamples")}
            {srsExamples.length > 0 && (
              <span className="bg-main-100 text-main-600 ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                {srsExamples.length}
              </span>
            )}
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-0.5">
            {tab === "general" ? (
              <>
                <div>
                  <label className="text-app-text-muted mb-1.5 block text-xs font-semibold tracking-wide uppercase">
                    {t("wordForm.labels.kanji")}
                  </label>
                  <input
                    type="text"
                    value={kanji}
                    onChange={(e) => setKanji(e.target.value)}
                    placeholder={t("wordForm.placeholders.kanji")}
                    className="border-app-border-strong bg-app-muted text-app-text focus:ring-main-300 w-full rounded-xl border px-3.5 py-2.5 text-xl font-bold transition-all focus:ring-2 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-app-text-muted mb-1.5 block text-xs font-semibold tracking-wide uppercase">
                    {t("wordForm.labels.pronunciation")}
                  </label>
                  <input
                    type="text"
                    value={pronunciation}
                    onChange={(e) => setPronunciation(e.target.value)}
                    placeholder={t("wordForm.placeholders.pronunciation")}
                    className="border-app-border-strong bg-app-muted text-app-text focus:ring-main-300 min-h-10.5 w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-app-text-muted mb-1.5 block text-xs font-semibold tracking-wide uppercase">
                    {t("wordForm.labels.meaning")}
                  </label>
                  <input
                    type="text"
                    value={meaning}
                    onChange={(e) => setMeaning(e.target.value)}
                    placeholder={t("wordForm.placeholders.meaning")}
                    className="border-app-border-strong bg-app-muted text-app-text focus:ring-main-300 min-h-10.5 w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-app-text-muted text-xs font-semibold tracking-wide uppercase">
                      {t("wordForm.labels.examplesAndNotes")}
                    </label>
                    {srsExamples.length > 0 && (
                      <button
                        type="button"
                        onClick={syncDescriptionFromSrs}
                        className="text-main-500 dark:text-main-600 hover:text-main-600 text-[10px] font-semibold"
                      >
                        {t("wordForm.actions.generateFromSrs")}
                      </button>
                    )}
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("wordForm.placeholders.description")}
                    rows={5}
                    className="border-app-border-strong bg-app-muted text-app-text focus:ring-main-300 w-full rounded-xl border px-3.5 py-2.5 font-mono text-sm leading-relaxed transition-all focus:ring-2 focus:outline-none"
                  />
                </div>

                {categories.length > 0 && (
                  <div>
                    <label className="text-app-text-muted mb-1.5 block text-xs font-semibold tracking-wide uppercase">
                      {t("wordForm.labels.categories")}
                    </label>
                    <CategoriesSelect
                      categories={categories}
                      selectedIds={categoryIds}
                      onChange={setCategoryIds}
                    />
                  </div>
                )}

                {allWords.length > 0 && (
                  <div>
                    <label className="text-app-text-muted mb-1.5 block text-xs font-semibold tracking-wide uppercase">
                      {t("wordForm.labels.relatedWords")}{" "}
                      <span className="text-app-text-muted font-normal normal-case">
                        {t("wordForm.labels.relatedWordsHint")}
                      </span>
                    </label>
                    <RelatedWordsSelect
                      allWords={allWords}
                      selectedIds={relatedWordIds}
                      currentWordId={initial?.id}
                      onChange={setRelatedWordIds}
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  {/* <div className="flex-1"> */}
                  <div className="max-w-2/5">
                    <label className="text-app-text-muted mb-1.5 block text-xs font-semibold tracking-wide uppercase">
                      {t("wordForm.labels.date")}
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="border-app-border-strong bg-app-muted text-app-text focus:ring-main-300 min-h-10.5 w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-app-text-muted mb-1.5 block text-xs font-semibold tracking-wide uppercase">
                      {t("wordForm.labels.jlptLevel")}{" "}
                      <span className="text-app-text-muted font-normal normal-case">
                        {t("wordForm.labels.jlptOptional")}
                      </span>
                    </label>
                    <div className="flex gap-1.5">
                      {JLPT_LEVELS.map((lvl) => {
                        const active = jlptLevel === lvl;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setJlptLevel(active ? null : lvl)}
                            className={`h-10.5 flex-1 rounded-xl border-2 text-sm font-semibold ${active ? "bg-main-400 border-main-400 text-white" : "border-app-border-strong text-app-text-muted bg-transparent"}`}
                          >
                            {lvl}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-app-text-muted mb-1.5 block text-xs font-semibold tracking-wide uppercase">
                    {t("wordForm.labels.level")}
                  </label>
                  <div
                    ref={levelPickerRef}
                    className="flex flex-col gap-1.5 sm:flex-row sm:gap-1"
                  >
                    {LEVEL_ROWS.map(({ key, labelKey, Icon }) => {
                      const isOpen = openLevelField === key;
                      const hideOnDesktop =
                        openLevelField !== null && openLevelField !== key;
                      const { level: rowLevel, starred: rowStarred } =
                        getLevelState(key);

                      return (
                        <div
                          key={key}
                          role="button"
                          tabIndex={0}
                          onClick={() => setOpenLevelField(key)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setOpenLevelField(key);
                            }
                          }}
                          className={`bg-app-muted border-app-border-strong flex h-10.5 cursor-pointer items-center gap-1.5 rounded-xl border px-2 py-2 font-semibold transition-all hover:brightness-[0.98] active:brightness-95 ${
                            hideOnDesktop ? "sm:hidden" : ""
                          } ${isOpen ? "w-full flex-1" : "flex-1"}`}
                        >
                          <Icon
                            size={16}
                            strokeWidth={2}
                            className="text-app-text-secondary mt-px shrink-0"
                          />
                          <span className="text-app-text-secondary truncate text-sm font-semibold">
                            {t(labelKey)}
                          </span>
                          {isOpen
                            ? renderLevelPicker(key)
                            : renderLevelIndicator(rowLevel, rowStarred)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <SrsExamplesEditor
                examples={srsExamples}
                onChange={setSrsExamples}
                headword={kanji.trim()}
                plainDescription={description}
                allWords={allWords}
                currentWordId={initial?.id}
              />
            )}
          </div>

          <button
            type="submit"
            className="bg-main-500 hover:bg-main-600 mt-4 w-full shrink-0 rounded-xl py-3 text-base font-bold text-white transition-all active:scale-[0.98]"
          >
            {initial
              ? t("wordForm.actions.submitUpdate")
              : t("wordForm.actions.submitAdd")}
          </button>
        </form>
      </div>
    </div>
  );
}
