import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../auth/AuthProvider";
import { useTranslation } from "../i18n/I18nProvider";
import { Eye, EyeOff } from "lucide-react";
import { LoadingSpinner } from "../components/LoadingSpinner";

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [focusedInput, setFocusedInput] = useState<"email" | "password" | null>(
    null,
  );

  const [showPassword, setShowPassword] = useState(false);

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
        {/* Email */}
        <label className="block">
          <span className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">
            {t("auth.email")}
          </span>

          <div className="relative mt-1">
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedInput("email")}
              onBlur={() => setFocusedInput(null)}
              className={`w-full rounded-xl border bg-app-surface px-3 py-2.5 text-app-text outline-none transition-all duration-150
                ${
                  focusedInput === "email"
                    ? "border-main-400 dark:border-main-500 ring-2 ring-main-400 dark:ring-main-500 ring-inset"
                    : "border-app-border"
                }
              `}
            />
          </div>
        </label>

        {/* Password */}
        <label className="block">
          <span className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">
            {t("auth.password")}
          </span>

          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedInput("password")}
              onBlur={() => setFocusedInput(null)}
              className={`w-full rounded-xl border bg-app-surface px-3 py-2.5 pr-12 text-app-text outline-none transition-all duration-150
                ${
                  focusedInput === "password"
                    ? "border-main-400 dark:border-main-500 ring-2 ring-main-400 dark:ring-main-500 ring-inset"
                    : "border-app-border"
                }
              `}
            />

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-5 top-1/2 -translate-y-1/2"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-5.5 h-5.5 text-app-text-muted hover:text-main-400 dark:hover:text-main-500 transition-colors" />
              ) : (
                <Eye className="w-5.5 h-5.5 text-app-text-muted hover:text-main-400 dark:hover:text-main-500 transition-colors" />
              )}
            </button>
          </div>
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-2xl font-semibold text-white bg-main-500 dark:bg-main-600 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <LoadingSpinner className="w-5 h-5" />
              {/* <span>{t("auth.login")}</span> */}
            </>
          ) : (
            t("auth.login")
          )}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm text-center text-app-text-secondary">
        <Link
          href="/forgot-password"
          className="text-main-500 dark:text-main-600 hover:underline"
        >
          {t("auth.forgotPassword")}
        </Link>

        <p>
          {t("auth.noAccount")}{" "}
          <Link
            href="/register"
            className="text-main-500 dark:text-main-600 hover:underline"
          >
            {t("auth.register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
