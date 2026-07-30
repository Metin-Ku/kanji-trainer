import type { ExpoConfig, ConfigContext } from "expo/config";

/** From expo.dev — @metinkuran/kanji-trainer (eas init creates this once). */
const EAS_PROJECT_ID = "12ede244-e1b1-420c-a774-1b4089d71289";

export default ({ config }: ConfigContext): ExpoConfig => {
  const easExtra = config.extra?.eas as { projectId?: string } | undefined;
  const projectId =
    easExtra?.projectId ?? process.env.EAS_PROJECT_ID ?? EAS_PROJECT_ID;

  return {
    ...config,
    name: "Kanji Trainer",
    slug: "kanji-trainer",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "kanji-trainer",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#fff7ed",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
    },
    plugins: [
      "expo-dev-client",
      "@react-native-community/datetimepicker",
      "expo-router",
      "expo-font",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          resizeMode: "contain",
          backgroundColor: "#fff7ed",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    ...(projectId
      ? {
          updates: {
            url: `https://u.expo.dev/${projectId}`,
          },
        }
      : {}),
    extra: {
      ...config.extra,
      apiOrigin: process.env.EXPO_PUBLIC_API_ORIGIN ?? "",
      ...(projectId ? { eas: { ...easExtra, projectId } } : {}),
    },
  };
};
