import { useMemo } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Plus, Trash2 } from "lucide-react-native";
import type { SrsExampleHint } from "@/lib/types";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  hints: SrsExampleHint[];
  onChange: (hints: SrsExampleHint[]) => void;
};

export function HintLinesEditor({ hints, onChange }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  function patchHint(index: number, text: string) {
    onChange(hints.map((h, i) => (i === index ? { ...h, text } : h)));
  }

  function addHint() {
    onChange([...hints, { text: "" }]);
  }

  function removeHint(index: number) {
    onChange(hints.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t("themeQuiz.hints")}</Text>
      {hints.map((h, i) => (
        <View key={i} style={styles.row}>
          <TextInput
            value={h.text}
            onChangeText={(text) => patchHint(i, text)}
            placeholder={t("srs.editor.placeholders.hint")}
            placeholderTextColor={theme.appTextMuted}
            style={styles.input}
          />
          <Pressable onPress={() => removeHint(i)} hitSlop={8}>
            <Trash2 size={16} color={theme.danger} />
          </Pressable>
        </View>
      ))}
      <Pressable onPress={addHint} style={styles.addBtn}>
        <Plus size={14} color={theme.main500} />
        <Text style={styles.addText}>{t("srs.editor.addLine")}</Text>
      </Pressable>
    </View>
  );
}

export function HintLinesDisplay({ hints }: { hints: SrsExampleHint[] }) {
  const { theme } = useTheme();
  if (!hints.length) return null;
  return (
    <View style={{ gap: 4, marginTop: 8 }}>
      {hints.map((h, i) => (
        <Text key={i} style={{ fontSize: 13, color: theme.appTextSecondary }}>
          {h.text}
        </Text>
      ))}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    label: { fontSize: 12, fontWeight: "600", color: theme.appTextSecondary },
    row: { flexDirection: "row", alignItems: "center", gap: 8 },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.appText,
      backgroundColor: theme.appMuted,
    },
    addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
    addText: { fontSize: 12, fontWeight: "600", color: theme.main500 },
  });
}
