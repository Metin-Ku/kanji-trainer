import { useAuth } from "../auth/AuthProvider";
import { LoadingSpinner } from "./LoadingSpinner";
import { Redirect, Route } from "wouter";

const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType;
}) {
  const { user, loading } = useAuth();

  if (PUBLIC_PATHS.has(path)) {
    return <Route path={path} component={Component} />;
  }

  if (loading) {
    return (
      <div className="bg-app-bg flex min-h-dvh items-center justify-center">
        <LoadingSpinner
          size={36}
          className="text-main-500 dark:text-main-600"
        />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Route path={path} component={Component} />;
}
