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
      <div className="min-h-dvh flex items-center justify-center bg-app-bg">
        <LoadingSpinner size={36} className="text-app-text-muted" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Route path={path} component={Component} />;
}
