import Constants from "expo-constants";

export function getApiOrigin(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_ORIGIN?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const extra = Constants.expoConfig?.extra as { apiOrigin?: string } | undefined;
  const fromExtra = extra?.apiOrigin?.trim();
  if (fromExtra) return fromExtra.replace(/\/+$/, "");

  return "";
}

export function apiUrl(path: string): string {
  const origin = getApiOrigin();
  if (!origin) return path;
  return path.startsWith("/") ? `${origin}${path}` : `${origin}/${path}`;
}
