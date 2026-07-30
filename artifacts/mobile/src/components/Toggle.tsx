import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

export function Toggle({ label, description, checked, onChange }: Props) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={[
        styles.row,
        {
          backgroundColor: theme.appSurface,
          borderColor: theme.appBorderStrong,
        },
      ]}
    >
      <View style={styles.textCol}>
        <Text style={[styles.label, { color: theme.appText }]}>{label}</Text>
        <Text style={[styles.description, { color: theme.appTextSecondary }]}>
          {description}
        </Text>
      </View>
      <View
        style={[
          styles.track,
          {
            backgroundColor: checked ? theme.main500 : theme.appBorderStrong,
          },
        ]}
      >
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: theme.appSurface,
              transform: [{ translateX: checked ? 20 : 0 }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  description: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    marginTop: 2,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
