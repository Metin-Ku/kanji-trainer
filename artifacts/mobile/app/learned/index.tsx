import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ArrowLeft, BookOpen, Languages, Waves } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";

const LINKS = [
  { path: "/learned/words", Icon: Languages, titleKey: "learned.wordsTitle" as const },
  {
    path: "/learned/pronunciation",
    Icon: Waves,
    titleKey: "learned.pronunciationTitle" as const,
  },
  {
    path: "/learned/meaning",
    Icon: BookOpen,
    titleKey: "learned.meaningTitle" as const,
  },
] as const;

export default function LearnedHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <ArrowLeft size={18} color={theme.appTextMuted} />
          <Text style={styles.backTitle}>{t("learned.hubTitle")}</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        {LINKS.map(({ path, Icon, titleKey }, i) => (
          <Pressable
            key={path}
            onPress={() => router.push(path as Href)}
            style={({ pressed }) => [
              styles.col,
              i < LINKS.length - 1 && styles.colBorder,
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.iconBox}>
              <Icon size={22} color={theme.main500} strokeWidth={1.8} />
            </View>
            <Text style={styles.colTitle}>{t(titleKey)}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.appBg },
    header: {
      backgroundColor: theme.appSurface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.appBorder,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 4 },
    backTitle: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: theme.main400,
    },
    row: { flex: 1, flexDirection: "row" },
    col: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      backgroundColor: theme.appSurface,
    },
    colBorder: {
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: theme.appBorder,
    },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.appAccent,
      alignItems: "center",
      justifyContent: "center",
    },
    colTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.appText,
      textAlign: "center",
      paddingHorizontal: 8,
    },
  });
}
