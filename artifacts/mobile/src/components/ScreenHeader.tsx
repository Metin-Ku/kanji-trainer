import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  title: string;
  onBack?: () => void;
};

/** Back row: arrow + title together (matches web). */
export function ScreenHeader({ title, onBack }: Props) {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack ?? (() => router.back())}
        style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.7 }]}
      >
        <ArrowLeft size={18} color={theme.appTextMuted} />
        <Text style={styles.title}>{title}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.appBorder,
      backgroundColor: theme.appSurface,
    },
    backRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      padding: 4,
      marginLeft: -4,
    },
    title: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1.5,
      textTransform: "uppercase",
      color: theme.main400,
    },
  });
}
