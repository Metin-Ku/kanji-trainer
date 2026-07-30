import { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { CategoryIcon } from "./CategoryIcon";

type Props = {
  label: string;
  iconSvg?: string | null;
  active: boolean;
  onPress: () => void;
};

export function CategoryChip({ label, iconSvg, active, onPress }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const tone = active ? "#fff" : theme.appTextSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <CategoryIcon svg={iconSvg} size={14} color={tone} />
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.appMuted,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    chipActive: {
      backgroundColor: theme.main500,
    },
    text: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.appTextSecondary,
    },
    textActive: {
      color: "#fff",
    },
  });
}
