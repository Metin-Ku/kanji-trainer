import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { StudyHeatmap } from "./StudyHeatmap";
import type { ActivityByDate } from "@/hooks/useStudyActivity";
import { ColorScheme } from "@/settings/appSettings";

type Props = {
  activityByDate: ActivityByDate;
  isActivityLoading?: boolean;
};

export function MiniHeatmapStrip({
  activityByDate,
  isActivityLoading: _isActivityLoading,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme, colorScheme } = useTheme();
  const styles = useMemo(() => createStyles(theme, colorScheme), [theme, colorScheme]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t("progress.miniHeatmap.title")}</Text>
      <StudyHeatmap
        isMainPage
        years={[]}
        heatmapYear={0}
        currentYear={0}
        setHeatmapYear={() => {}}
        activityByDate={activityByDate}
        range={{ kind: "ytd" }}
        compact
        onTap={() => router.push("/progress" as Href)}
      />
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"], colorScheme: ColorScheme) {
  const isDark = colorScheme === "dark";
  return StyleSheet.create({
    wrap: {
      borderWidth: 1,
      borderColor: isDark ? theme.main900 : theme.main200,
      backgroundColor: theme.appSurface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 12,
    },
    title: {
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 1,
      textTransform: "uppercase",
      color: theme.appTextSecondary,
      marginBottom: 8,
    },
  });
}
