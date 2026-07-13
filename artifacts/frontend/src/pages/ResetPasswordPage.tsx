import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { resetPassword } from "../lib/authApi";
import { useTranslation } from "../i18n/I18nProvider";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const search = useSearch();
  const [, navigate] = useLocation();
  const token = new URLSearchParams(search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError(t("auth.invalidResetToken"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh max-w-md mx-auto flex flex-col justify-center px-6 py-10 bg-app-bg">
      <h1 className="text-2xl font-bold text-app-text mb-1">{t("auth.resetTitle")}</h1>
      <p className="text-sm text-app-text-secondary mb-6">{t("auth.resetSubtitle")}</p>

      {done ? (
        <p className="text-sm text-main-600">{t("auth.resetDone")}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">
              {t("auth.newPassword")}
            </span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-app-text"
            />
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-2xl font-semibold text-white bg-main-500 disabled:opacity-60"
          >
            {t("auth.updatePassword")}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-center">
        <Link href="/login" className="text-main-500 dark:text-main-600 hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </p>
    </div>
  );
}
