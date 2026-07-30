import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { LoadingSpinner } from "./LoadingSpinner";

type Props = {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  loading?: boolean;
  onPress: () => void;
};

export function StudyLinkRow({
  title,
  subtitle,
  Icon,
  loading = false,
  onPress,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
        loading && styles.rowDisabled,
      ]}
    >
      <View style={styles.iconBox}>
        <Icon size={18} color={theme.main500} strokeWidth={1.8} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {loading ? (
          <LoadingSpinner size={14} color={theme.appTextMuted} />
        ) : (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>
      <ChevronRight size={18} color={theme.appTextMuted} />
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      backgroundColor: theme.appSurface,
      borderWidth: 1,
      borderColor: theme.appBorder,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowPressed: {
      transform: [{ scale: 0.99 }],
    },
    rowDisabled: {
      opacity: 0.6,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.appAccent,
      alignItems: "center",
      justifyContent: "center",
    },
    textCol: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.appText,
    },
    subtitle: {
      marginTop: 2,
      fontSize: 12,
      color: theme.appTextMuted,
    },
  });
}
