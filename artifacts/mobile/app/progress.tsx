import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DeckActivityChart } from "@/components/progress/DeckActivityChart";
import { JlptProgressSection } from "@/components/progress/JlptProgressSection";
import { LevelDistributionChart } from "@/components/progress/LevelDistributionChart";
import { ProgressSection } from "@/components/progress/ProgressSection";
import { StudiedWordsSection } from "@/components/progress/StudiedWordsSection";
import { StudyHeatmap } from "@/components/progress/StudyHeatmap";
import { LoadingPlaceholder } from "@/components/LoadingPlaceholder";
import { useAuth } from "@/auth/AuthProvider";
import { useStudyActivity } from "@/hooks/useStudyActivity";
import { useWords } from "@/hooks/useWords";
import { membershipYear, yearRange } from "@/lib/authApi";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";

export default function ProgressScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { words, isLoading } = useWords();
  const { activityByDate, isLoading: activityLoading } = useStudyActivity();

  const currentYear = new Date().getFullYear();
  const minYear = user ? membershipYear(user.createdAt) : currentYear;
  const years = useMemo(
    () => yearRange(minYear, currentYear),
    [minYear, currentYear],
  );
  const [heatmapYear, setHeatmapYear] = useState(currentYear);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push("/")}
          style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.7 }]}
        >
          <ArrowLeft size={18} color={theme.appTextMuted} />
          <Text style={styles.backLabel}>{t("nav.progress")}</Text>
        </Pressable>
        <Text style={styles.title}>{t("progress.title")}</Text>
        <Text style={styles.subtitle}>{t("progress.subtitle")}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <StudiedWordsSection />

        {isLoading ? (
          <LoadingPlaceholder padding="lg" />
        ) : (
          <>
            <ProgressSection title={t("progress.sections.heatmap")}>
              <StudyHeatmap
                isMainPage={false}
                years={years}
                heatmapYear={heatmapYear}
                currentYear={currentYear}
                setHeatmapYear={setHeatmapYear}
                activityByDate={activityByDate}
                isActivityLoading={activityLoading}
                range={{ kind: "year", year: heatmapYear }}
              />
            </ProgressSection>

            <ProgressSection title={t("progress.sections.deckActivity")}>
              <DeckActivityChart activityByDate={activityByDate} days={84} />
            </ProgressSection>

            <ProgressSection title={t("progress.sections.levelDistribution")}>
              <LevelDistributionChart words={words} />
            </ProgressSection>

            <ProgressSection title={t("progress.sections.jlpt")}>
              <JlptProgressSection words={words} />
            </ProgressSection>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.appBg,
    },
    header: {
      backgroundColor: theme.appSurface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.appBorder,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
    },
    backRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginLeft: -4,
      padding: 4,
    },
    backLabel: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1.5,
      textTransform: "uppercase",
      color: theme.main400,
    },
    title: {
      marginTop: 8,
      fontSize: 20,
      fontWeight: "700",
      color: theme.appText,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 14,
      color: theme.appTextSecondary,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 32,
      gap: 16,
    },
    loadingBox: {
      paddingVertical: 48,
      alignItems: "center",
    },
  });
}
