import { useCallback, useEffect, useState } from "react";
import {
  APP_SETTINGS_DEFAULTS,
  getAppSettings,
  saveAppSettings,
  type AppSettings,
} from "@/settings/appSettings";

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(APP_SETTINGS_DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAppSettings().then((loaded) => {
      if (cancelled) return;
      setSettings(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const patchSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const next = await saveAppSettings(patch);
    setSettings(next);
    return next;
  }, []);

  return { settings, ready, patchSettings };
}
