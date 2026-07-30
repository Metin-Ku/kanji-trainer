import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BookOpen, Languages, Waves, type LucideIcon } from "lucide-react-native";
import type { Word } from "@/lib/types";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  word: Word;
};

const AXES: {
  Icon: LucideIcon;
  levelKey: "level" | "pronLevel" | "meaningLevel";
  starKey: "starred" | "pronStarred" | "meaningStarred";
}[] = [
  { Icon: Languages, levelKey: "level", starKey: "starred" },
  { Icon: Waves, levelKey: "pronLevel", starKey: "pronStarred" },
  { Icon: BookOpen, levelKey: "meaningLevel", starKey: "meaningStarred" },
];

export function LevelPills({ word }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      {AXES.map(({ Icon, levelKey, starKey }) => {
        const level = word[levelKey];
        const starred = word[starKey];
        const bg = starred ? theme.starColor : theme.levelColor(level, level);
        return (
          <View key={levelKey} style={styles.pill}>
            <Icon size={13} color={theme.appTextSecondary} strokeWidth={2} />
            <View style={[styles.badge, { backgroundColor: bg }]}>
              <Text style={styles.badgeText}>{starred ? "★" : level}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.appMuted,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    badge: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.white,
    },
  });
}
