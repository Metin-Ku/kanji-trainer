import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../auth/AuthProvider";
import { useTranslation } from "../i18n/I18nProvider";

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh max-w-md mx-auto flex flex-col justify-center px-6 py-10 bg-app-bg">
      <h1 className="text-2xl font-bold text-app-text mb-1">{t("auth.registerTitle")}</h1>
      <p className="text-sm text-app-text-secondary mb-6">{t("auth.registerSubtitle")}</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">
            {t("auth.email")}
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-app-text"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">
            {t("auth.passwordMin")}
          </span>
          <input
            type="password"
            autoComplete="new-password"
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
          {t("auth.createAccount")}
        </button>
      </form>

      <p className="mt-6 text-sm text-center text-app-text-secondary">
        {t("auth.hasAccount")}{" "}
        <Link href="/login" className="text-main-500 dark:text-main-600 hover:underline">
          {t("auth.login")}
        </Link>
      </p>
    </div>
  );
}
