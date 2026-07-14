import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  demoLogin,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  type AuthUser,
} from "../lib/authApi";
import { isDemoMode } from "../lib/demoMode";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function resolveUser(): Promise<AuthUser | null> {
  const me = await fetchMe();
  if (me) return me;
  if (isDemoMode()) return demoLogin();
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const demo = isDemoMode();

  const refresh = useCallback(async () => {
    setUser(await resolveUser());
  }, []);

  useEffect(() => {
    resolveUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    setUser(u);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const u = await apiRegister(email, password);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    if (demo) {
      setUser(await demoLogin());
    } else {
      setUser(null);
    }
  }, [demo]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isDemoMode: demo,
      login,
      register,
      logout,
      refresh,
    }),
    [user, loading, demo, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
