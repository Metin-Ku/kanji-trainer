import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../auth/AuthProvider";
import { useTranslation } from "../i18n/I18nProvider";
import { Eye } from "lucide-react";

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focusedInput, setFocusedInput] = useState<"email" | "password" | null>(
    null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh max-w-md mx-auto flex flex-col justify-center px-6 py-10 bg-app-bg">
      <h1 className="text-2xl font-bold text-app-text mb-1">
        {t("auth.loginTitle")}
      </h1>
      <p className="text-sm text-app-text-secondary mb-6">
        {t("auth.loginSubtitle")}
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">
            {t("auth.email")}
          </span>
          {/* <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-app-text"
          /> */}
          <input
            ref={inputRef}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedInput("email")}
            onBlur={() => setFocusedInput(null)}
            className={`mt-1 w-full rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-app-text outline-none transition-all duration-150
          ${
            focusedInput === "email"
              ? "border-main-300 ring-2 ring-main-300 ring-inset ring-offset-0"
              : "border-app-border"
          }
        `}
          />
          <Eye className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-app-text-secondary" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">
            {t("auth.password")}
          </span>
          {/* <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-app-text"
          /> */}
          <input
            ref={inputRef}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusedInput("password")}
            onBlur={() => setFocusedInput(null)}
            className={`mt-1 w-full rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-app-text outline-none transition-all duration-150
              ${
                focusedInput === "password"
                  ? "border-main-300 ring-2 ring-main-300 ring-inset ring-offset-0"
                  : "border-app-border"
              }
            `}
          />
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-2xl font-semibold text-white bg-main-500 disabled:opacity-60"
        >
          {t("auth.login")}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm text-center text-app-text-secondary">
        <Link href="/forgot-password" className="text-main-500 dark:text-main-600 hover:underline">
          {t("auth.forgotPassword")}
        </Link>
        <p>
          {t("auth.noAccount")}{" "}
          <Link href="/register" className="text-main-500 dark:text-main-600 hover:underline">
            {t("auth.register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
