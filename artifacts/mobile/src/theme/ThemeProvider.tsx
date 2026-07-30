import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { StatusBar } from "expo-status-bar";
import {
  getAppSettings,
  getStoredPaletteName,
  saveAppSettings,
  savePaletteName,
  type ColorScheme,
} from "@/settings/appSettings";
import { buildTheme, defaultTheme, type AppTheme } from "./buildTheme";
import {
  DEFAULT_PALETTE,
  isPaletteName,
  type PaletteName,
} from "./palettes";

type ThemeContextValue = {
  theme: AppTheme;
  ready: boolean;
  paletteName: PaletteName;
  colorScheme: ColorScheme;
  setPalette: (name: PaletteName) => void;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [paletteName, setPaletteName] = useState<PaletteName>(DEFAULT_PALETTE);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("light");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [settings, storedPalette] = await Promise.all([
        getAppSettings(),
        getStoredPaletteName(),
      ]);
      if (cancelled) return;
      if (storedPalette && isPaletteName(storedPalette)) {
        setPaletteName(storedPalette);
      }
      setColorSchemeState(settings.colorScheme);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const theme = useMemo(
    () => buildTheme(paletteName, colorScheme),
    [paletteName, colorScheme],
  );

  const setPalette = useCallback((name: PaletteName) => {
    setPaletteName(name);
    void savePaletteName(name);
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    void saveAppSettings({ colorScheme: scheme });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      ready,
      paletteName,
      colorScheme,
      setPalette,
      setColorScheme,
    }),
    [theme, ready, paletteName, colorScheme, setPalette, setColorScheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: defaultTheme,
      ready: true,
      paletteName: DEFAULT_PALETTE,
      colorScheme: "light" as ColorScheme,
      setPalette: () => {},
      setColorScheme: () => {},
    };
  }
  return ctx;
}
