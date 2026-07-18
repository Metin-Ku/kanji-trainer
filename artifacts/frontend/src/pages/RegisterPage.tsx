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
    <div className="bg-app-bg mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-app-text mb-1 text-2xl font-bold">
        {t("auth.registerTitle")}
      </h1>
      <p className="text-app-text-secondary mb-6 text-sm">
        {t("auth.registerSubtitle")}
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-app-text-muted text-xs font-semibold tracking-wider uppercase">
            {t("auth.email")}
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-app-border bg-app-surface text-app-text mt-1 w-full rounded-xl border px-3 py-2.5"
          />
        </label>
        <label className="block">
          <span className="text-app-text-muted text-xs font-semibold tracking-wider uppercase">
            {t("auth.passwordMin")}
          </span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-app-border bg-app-surface text-app-text mt-1 w-full rounded-xl border px-3 py-2.5"
          />
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="bg-main-500 w-full rounded-2xl py-3 font-semibold text-white disabled:opacity-60"
        >
          {t("auth.createAccount")}
        </button>
      </form>

      <p className="text-app-text-secondary mt-6 text-center text-sm">
        {t("auth.hasAccount")}{" "}
        <Link
          href="/login"
          className="text-main-500 dark:text-main-600 hover:underline"
        >
          {t("auth.login")}
        </Link>
      </p>
    </div>
  );
}
