import { useState } from "react";
import { ArrowLeft, Check, Palette, BookOpen, Database, Download, Link2, Loader2, Languages } from "lucide-react";
import { useLocation } from "wouter";
import {
  applyTheme,
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
import { apiUrl } from "../lib/apiOrigin";
import { relinkAllWordsSrsExamples } from "../lib/wordLinking";
import { sanitizeSrsExamples } from "../lib/srsExamples";
import { useTranslation } from "../i18n/I18nProvider";
import { LOCALES } from "../i18n/locales";

type Section = "styling" | "srs" | "database" | "language";

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
    <label className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 cursor-pointer hover:border-gray-300">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-main-500" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

export function SettingsPage() {
  const { t, locale, setLocale } = useTranslation();
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
      const res = await fetch(apiUrl("/api/backup"));
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
    <div className="min-h-dvh max-w-2xl mx-auto bg-gray-50 flex flex-col sm:border-l sm:border-r sm:border-gray-100">
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 p-1 -ml-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">
            {t("settings.title")}
          </span>
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        <aside className="w-44 shrink-0 bg-white border-r border-gray-100 p-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
            {t("settings.sections")}
          </p>
          <button
            onClick={() => setSection("styling")}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              section === "styling"
                ? "bg-main-50 text-main-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Palette size={16} strokeWidth={2} />
            {t("settings.styling.nav")}
          </button>
          <button
            onClick={() => setSection("srs")}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors mt-1 ${
              section === "srs"
                ? "bg-main-50 text-main-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <BookOpen size={16} strokeWidth={2} />
            {t("settings.srs.nav")}
          </button>
          <button
            onClick={() => setSection("database")}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors mt-1 ${
              section === "database"
                ? "bg-main-50 text-main-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Database size={16} strokeWidth={2} />
            {t("settings.database.nav")}
          </button>
          <button
            onClick={() => setSection("language")}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors mt-1 ${
              section === "language"
                ? "bg-main-50 text-main-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Languages size={16} strokeWidth={2} />
            {t("settings.language.nav")}
          </button>
        </aside>

        <main className="flex-1 overflow-y-auto p-4">
          {section === "styling" && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-bold text-gray-900 mb-1">{t("settings.styling.title")}</h2>
              <p className="text-sm text-gray-500 mb-5">
                {t("settings.styling.description")}
              </p>

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
                          ? "border-main-400 ring-2 ring-main-200 bg-white"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-sm font-semibold text-gray-800 capitalize">
                          {name}
                        </span>
                        {selected && (
                          <span className="flex items-center gap-1 text-xs font-medium text-main-500">
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
              <h2 className="text-lg font-bold text-gray-900 mb-1">{t("settings.srs.title")}</h2>
              <p className="text-sm text-gray-500 mb-5">
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
            </div>
          )}

          {section === "database" && (
            <div className="max-w-lg space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  {t("settings.database.title")}
                </h2>
                <p className="text-sm text-gray-500 mb-5">
                  {t("settings.database.description")}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {t("settings.database.backup.title")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
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
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  {t("settings.database.backup.button")}
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {t("settings.database.relink.title")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {t("settings.database.relink.description")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={relinkAllExamples}
                  disabled={relinkBusy || words.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:border-main-300 hover:text-main-600 disabled:opacity-50"
                >
                  {relinkBusy ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Link2 size={16} />
                  )}
                  {t("settings.database.relink.button")}
                </button>
                {relinkProgress && (
                  <p className="text-xs text-gray-500 tabular-nums">
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
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {t("settings.language.title")}
              </h2>
              <p className="text-sm text-gray-500 mb-5">
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
                      className={`text-left rounded-xl border p-4 transition-all active:scale-[0.99] ${
                        selected
                          ? "border-main-400 ring-2 ring-main-200 bg-white"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">
                          {t(labelKey)}
                        </span>
                        {selected && (
                          <span className="flex items-center gap-1 text-xs font-medium text-main-500">
                            <Check size={14} strokeWidth={2.5} />
                            {t("settings.styling.selected")}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
