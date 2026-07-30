import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePickerField({ value, onChange }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [show, setShow] = useState(false);
  const date = parseDate(value);

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") {
      setShow(false);
      if (event.type === "dismissed") return;
    }
    if (selected) onChange(formatDate(selected));
  }

  return (
    <View>
      <Pressable
        onPress={() => setShow(true)}
        style={({ pressed }) => [styles.field, pressed && { opacity: 0.9 }]}
      >
        <Text style={styles.fieldText}>{value}</Text>
      </Pressable>

      {show && Platform.OS === "ios" ? (
        <View style={styles.iosPickerWrap}>
          <View style={styles.iosPickerBar}>
            <Pressable onPress={() => setShow(false)} hitSlop={8}>
              <Text style={styles.iosDone}>OK</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            onChange={handleChange}
            themeVariant={theme.colorScheme === "dark" ? "dark" : "light"}
          />
        </View>
      ) : null}

      {show && Platform.OS === "android" ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    field: {
      backgroundColor: theme.appSurface,
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    fieldText: {
      fontSize: 15,
      color: theme.appText,
    },
    iosPickerWrap: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.appBorder,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.appSurface,
    },
    iosPickerBar: {
      alignItems: "flex-end",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.appBorder,
    },
    iosDone: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.main500,
    },
  });
}
