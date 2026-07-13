import { useState } from "react";
import { ArrowLeft, Check, Palette, BookOpen, Database, Download, Link2, Languages, LogOut, User } from "lucide-react";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useLocation } from "wouter";
import {
  applyTheme,
  applyColorScheme,
  getPalette,
  getStoredPalette,
  PALETTE_NAMES,
  SHADES,
  type PaletteName,
} from "../theme";
import {
  getAppSettings,
  saveAppSettings,
  type AppSettings,
} from "../settings/appSettings";
import { useWords } from "../hooks/useWords";
import { apiFetch } from "../lib/apiOrigin";
import { useAuth } from "../auth/AuthProvider";
import { relinkAllWordsSrsExamples } from "../lib/wordLinking";
import { sanitizeSrsExamples } from "../lib/srsExamples";
import { useTranslation } from "../i18n/I18nProvider";
import { LOCALES } from "../i18n/locales";
import { useDailyGoal } from "../hooks/useDailyGoal";
import {
  DAILY_GOAL_DECK_IDS,
  DAILY_TARGET_PRESETS,
  MAX_DAILY_TARGET,
  MIN_DAILY_TARGET,
} from "../lib/dailyGoal";
import { srsDeckLabel } from "../i18n/srsDeckLabels";

type Section = "styling" | "srs" | "database" | "language" | "account";

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-app-border-strong bg-app-surface p-4 cursor-pointer hover:border-app-border-strong">
      <div>
        <p className="text-sm font-semibold text-app-text">{label}</p>
        <p className="text-xs text-app-text-secondary mt-1 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-main-500" : "bg-app-border-strong"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-app-surface shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

export function SettingsPage() {
  const { t, locale, setLocale } = useTranslation();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [section, setSection] = useState<Section>("styling");
  const [palette, setPalette] = useState<PaletteName>(() => getStoredPalette());
  const [appSettings, setAppSettings] = useState<AppSettings>(() =>
    getAppSettings(),
  );
  const { words, updateWordAsync } = useWords();
  const [backupBusy, setBackupBusy] = useState(false);
  const [relinkBusy, setRelinkBusy] = useState(false);
  const [relinkProgress, setRelinkProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { decks: dailyDeckProgress, setDeckTarget } = useDailyGoal();

  function selectPalette(name: PaletteName) {
    applyTheme(name);
    setPalette(name);
  }

  function patchSettings(patch: Partial<AppSettings>) {
    setAppSettings(saveAppSettings(patch));
  }

  async function downloadBackup() {
    setBackupBusy(true);
    setStatusMessage(null);
    try {
      const res = await apiFetch("/api/backup");
      if (!res.ok) throw new Error("backup failed");
      const data = await res.json();
      const stamp = new Date().toISOString().slice(0, 10);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kanji-trainer-backup-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage(t("settings.database.backup.success"));
    } catch {
      setStatusMessage(t("settings.database.backup.failed"));
    } finally {
      setBackupBusy(false);
    }
  }

  async function relinkAllExamples() {
    const withExamples = words.filter((w) => w.srsExamples?.length);
    if (withExamples.length === 0) {
      setStatusMessage(t("settings.database.relink.noWords"));
      return;
    }
    if (
      !confirm(
        t("settings.database.relink.confirm", { count: withExamples.length }),
      )
    ) {
      return;
    }

    setRelinkBusy(true);
    setStatusMessage(null);
    setRelinkProgress({ done: 0, total: withExamples.length });
    try {
      const results = await relinkAllWordsSrsExamples(words, (done, total) => {
        setRelinkProgress({ done, total });
      });
      for (const { wordId, srsExamples } of results) {
        await updateWordAsync(wordId, {
          srsExamples: sanitizeSrsExamples(srsExamples),
        });
      }
      setStatusMessage(
        t("settings.database.relink.success", { count: results.length }),
      );
    } catch {
      setStatusMessage(t("settings.database.relink.failed"));
    } finally {
      setRelinkBusy(false);
      setRelinkProgress(null);
    }
  }

  return (
    <div className="min-h-dvh max-w-2xl mx-auto bg-app-bg flex flex-col sm:border-l sm:border-r sm:border-app-border">
      <div className="bg-app-surface border-b border-app-border px-5 pt-4 pb-4 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted hover:text-app-text-secondary transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">
            {t("settings.title")}
          </span>
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        <aside className="w-44 shrink-0 bg-app-surface border-r border-app-border p-3">
          <p className="text-[10px] font-semibold text-app-text-muted uppercase tracking-wider px-2 mb-2">
            {t("settings.sections")}
          </p>
          <button
            onClick={() => setSection("styling")}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              section === "styling"
                ? "bg-main-50 dark:bg-main-950 text-main-500 dark:text-main-600"
                : "text-app-text-secondary hover:bg-app-muted"
            }`}
          >
            <Palette size={16} strokeWidth={2} />
            {t("settings.styling.nav")}
          </button>
          <button
            onClick={() => setSection("srs")}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors mt-1 ${
              section === "srs"
                ? "bg-main-50 dark:bg-main-950 text-main-500 dark:text-main-600"
                : "text-app-text-secondary hover:bg-app-muted"
            }`}
          >
            <BookOpen size={16} strokeWidth={2} />
            {t("settings.srs.nav")}
          </button>
          <button
            onClick={() => setSection("database")}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors mt-1 ${
              section === "database"
                ? "bg-main-50 dark:bg-main-950 text-main-500 dark:text-main-600"
                : "text-app-text-secondary hover:bg-app-muted"
            }`}
          >
            <Database size={16} strokeWidth={2} />
            {t("settings.database.nav")}
          </button>
          <button
            onClick={() => setSection("language")}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors mt-1 ${
              section === "language"
                ? "bg-main-50 dark:bg-main-950 text-main-500 dark:text-main-600"
                : "text-app-text-secondary hover:bg-app-muted"
            }`}
          >
            <Languages size={16} strokeWidth={2} />
            {t("settings.language.nav")}
          </button>
          <button
            onClick={() => setSection("account")}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors mt-1 ${
              section === "account"
                ? "bg-main-50 dark:bg-main-950 text-main-500 dark:text-main-600"
                : "text-app-text-secondary hover:bg-app-muted"
            }`}
          >
            <User size={16} strokeWidth={2} />
            {t("settings.account.nav")}
          </button>
        </aside>

        <main className="flex-1 overflow-y-auto px-5 py-4">
          {section === "styling" && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-bold text-app-text mb-1">{t("settings.styling.title")}</h2>
              <p className="text-sm text-app-text-secondary mb-5">
                {t("settings.styling.description")}
              </p>

              <div className="max-w-lg mb-5">
                <Toggle
                  label={t("settings.styling.darkMode.label")}
                  description={t("settings.styling.darkMode.description")}
                  checked={appSettings.colorScheme === "dark"}
                  onChange={(v) => {
                    const scheme = v ? "dark" : "light";
                    applyColorScheme(scheme);
                    patchSettings({ colorScheme: scheme });
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PALETTE_NAMES.map((name) => {
                  const colors = getPalette(name);
                  const selected = palette === name;
                  return (
                    <button
                      key={name}
                      onClick={() => selectPalette(name)}
                      className={`text-left rounded-xl border p-3 transition-all active:scale-[0.99] ${
                        selected
                          ? "border-main-400 ring-2 ring-main-500/25 bg-app-surface"
                          : "border-app-border-strong bg-app-surface hover:border-app-border-strong"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-sm font-semibold text-app-text capitalize">
                          {name}
                        </span>
                        {selected && (
                          <span className="flex items-center gap-1 text-xs font-medium text-main-500 dark:text-main-600">
                            <Check size={14} strokeWidth={2.5} />
                            {t("settings.styling.selected")}
                          </span>
                        )}
                      </div>
                      <div className="flex rounded-lg overflow-hidden h-6">
                        {SHADES.map((shade) => (
                          <div
                            key={shade}
                            className="flex-1 min-w-0"
                            style={{ background: colors[shade] }}
                            title={`${name}-${shade}`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {section === "srs" && (
            <div className="max-w-lg space-y-3">
              <h2 className="text-lg font-bold text-app-text mb-1">{t("settings.srs.title")}</h2>
              <p className="text-sm text-app-text-secondary mb-5">
                {t("settings.srs.description")}
              </p>

              <Toggle
                label={t("settings.srs.wordLinks.label")}
                description={t("settings.srs.wordLinks.description")}
                checked={appSettings.srsSentenceWordLinks}
                onChange={(v) => patchSettings({ srsSentenceWordLinks: v })}
              />

              <Toggle
                label={t("settings.srs.romajiInput.label")}
                description={t("settings.srs.romajiInput.description")}
                checked={appSettings.srsRomajiInput}
                onChange={(v) => patchSettings({ srsRomajiInput: v })}
              />

              <div className="rounded-xl border border-app-border-strong bg-app-surface p-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-app-text">
                    {t("settings.srs.dailyGoal.label")}
                  </p>
                  <p className="text-xs text-app-text-secondary mt-1 leading-relaxed">
                    {t("settings.srs.dailyGoal.description")}
                  </p>
                  <p className="text-xs text-app-text-muted mt-1 leading-relaxed">
                    {t("dailyGoal.settingsHint")}
                  </p>
                </div>

                {DAILY_GOAL_DECK_IDS.map((deckId) => {
                  const deckProgress = dailyDeckProgress.find((d) => d.deck === deckId);
                  const target = deckProgress?.target ?? 0;
                  const deckName = srsDeckLabel(t, deckId).title;
                  // const deckName =
                  // deckId === "flashcard"
                  //   ? t("dailyGoal.decks.flashcard")
                  //   : srsDeckLabel(t, deckId).title;

                  return (
                    <div
                      key={deckId}
                      className="rounded-lg border border-app-border bg-app-muted/80 p-3 space-y-2"
                    >
                      <p className="text-sm font-semibold text-app-text">{deckName}</p>
                      <div className="flex flex-wrap gap-2">
                        {DAILY_TARGET_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setDeckTarget(deckId, preset)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              target === preset
                                ? "bg-main-500 text-white"
                                : "bg-app-surface text-app-text-secondary hover:bg-app-muted border border-app-border-strong"
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setDeckTarget(deckId, 0)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            target === 0
                              ? "bg-gray-600 text-white"
                              : "bg-app-surface text-app-text-secondary hover:bg-app-muted border border-app-border-strong"
                          }`}
                        >
                          {t("dailyGoal.off")}
                        </button>
                      </div>
                      <input
                        type="number"
                        min={MIN_DAILY_TARGET}
                        max={MAX_DAILY_TARGET}
                        value={target}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isNaN(n)) setDeckTarget(deckId, n);
                        }}
                        className="w-full rounded-xl border border-app-border-strong bg-app-surface px-3 py-2 text-sm text-app-text"
                        aria-label={t("dailyGoal.settingsTargetDeck", { deck: deckName })}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {section === "database" && (
            <div className="max-w-lg space-y-4">
              <div>
                <h2 className="text-lg font-bold text-app-text mb-1">
                  {t("settings.database.title")}
                </h2>
                <p className="text-sm text-app-text-secondary mb-5">
                  {t("settings.database.description")}
                </p>
              </div>

              <div className="rounded-xl border border-app-border-strong bg-app-surface p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-app-text">
                    {t("settings.database.backup.title")}
                  </p>
                  <p className="text-xs text-app-text-secondary mt-1 leading-relaxed">
                    {t("settings.database.backup.description")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadBackup}
                  disabled={backupBusy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-main-500 text-white text-sm font-semibold hover:bg-main-600 disabled:opacity-50"
                >
                  {backupBusy ? (
                    <LoadingSpinner size={16} className="text-white" />
                  ) : (
                    <Download size={16} />
                  )}
                  {t("settings.database.backup.button")}
                </button>
              </div>

              <div className="rounded-xl border border-app-border-strong bg-app-surface p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-app-text">
                    {t("settings.database.relink.title")}
                  </p>
                  <p className="text-xs text-app-text-secondary mt-1 leading-relaxed">
                    {t("settings.database.relink.description")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={relinkAllExamples}
                  disabled={relinkBusy || words.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-app-border-strong bg-app-surface text-app-text text-sm font-semibold hover:border-main-300 hover:text-main-600 disabled:opacity-50"
                >
                  {relinkBusy ? (
                    <LoadingSpinner size={16} className="text-main-500 dark:text-main-600" />
                  ) : (
                    <Link2 size={16} />
                  )}
                  {t("settings.database.relink.button")}
                </button>
                {relinkProgress && (
                  <p className="text-xs text-app-text-secondary tabular-nums">
                    {t("settings.database.relink.progress", {
                      done: relinkProgress.done,
                      total: relinkProgress.total,
                    })}
                  </p>
                )}
              </div>

              {statusMessage && (
                <p className="text-sm text-main-600 font-medium">{statusMessage}</p>
              )}
            </div>
          )}

          {section === "language" && (
            <div className="max-w-lg">
              <h2 className="text-lg font-bold text-app-text mb-1">
                {t("settings.language.title")}
              </h2>
              <p className="text-sm text-app-text-secondary mb-5">
                {t("settings.language.description")}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {LOCALES.map(({ id, labelKey }) => {
                  const selected = locale === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setLocale(id);
                        patchSettings({ locale: id });
                      }}
                      className={`rounded-xl border p-4 transition-all active:scale-[0.99] ${
                        selected
                          ? "border-main-400 ring-2 ring-main-500/25 bg-app-surface"
                          : "border-app-border-strong bg-app-surface hover:border-app-border-strong"
                      }`}
                    >
                      <div className="sm:text-left">
                        <span className="text-sm font-semibold text-app-text">
                          {t(labelKey)}
                        </span>
                        {/* {selected && (
                          <span className="flex items-center gap-1 text-xs font-medium text-main-500 dark:text-main-600">
                            <Check size={14} strokeWidth={2.5} />
                            {t("settings.styling.selected")}
                          </span>
                        )} */}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {section === "account" && user && (
            <div className="max-w-lg space-y-4">
              <div>
                <h2 className="text-lg font-bold text-app-text mb-1">
                  {t("settings.account.title")}
                </h2>
                <p className="text-sm text-app-text-secondary mb-5">
                  {t("settings.account.description")}
                </p>
              </div>

              <div className="rounded-xl border border-app-border-strong bg-app-surface p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">
                    {t("settings.account.email")}
                  </p>
                  <p className="text-sm text-app-text mt-1">{user.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">
                    {t("settings.account.role")}
                  </p>
                  <p className="text-sm text-app-text mt-1">
                    {user.role === "admin"
                      ? t("auth.roleAdmin")
                      : user.role === "moderator"
                        ? t("auth.roleModerator")
                        : t("auth.roleUser")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate("/login");
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-app-border-strong bg-app-surface text-app-text text-sm font-semibold hover:border-red-300 hover:text-red-600"
              >
                <LogOut size={16} />
                {t("settings.account.logout")}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
