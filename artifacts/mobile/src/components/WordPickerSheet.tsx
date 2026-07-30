import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Word } from "@/lib/types";
import { filterWords } from "@/lib/filterWords";
import { SlideUpModal } from "@/components/SlideUpModal";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  visible: boolean;
  words: Word[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
};

export function WordPickerSheet({
  visible,
  words,
  selectedIds,
  onToggle,
  onClose,
  onConfirm,
  title,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [query, setQuery] = useState("");

  const filtered = filterWords(words, query);

  return (
    <SlideUpModal
      visible={visible}
      onClose={onClose}
      title={title ?? t("wordPicker.title")}
      maxHeight="85%"
    >
      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("home.searchPlaceholder")}
          placeholderTextColor={theme.appTextMuted}
          style={styles.search}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        renderItem={({ item }) => {
          const selected = selectedIds.has(item.id);
          return (
            <Pressable
              onPress={() => onToggle(item.id)}
              style={({ pressed }) => [
                styles.row,
                selected && styles.rowSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={[styles.check, selected && styles.checkSelected]}>
                {selected ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.kanji}>{item.kanji}</Text>
                {item.pronunciation ? (
                  <Text style={styles.sub} numberOfLines={1}>
                    {item.pronunciation}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>{t("common.noResultsForQuery", { query })}</Text>
        }
      />
      {onConfirm ? (
        <View style={styles.footer}>
          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.confirmBtnText}>{t("common.add")}</Text>
          </Pressable>
        </View>
      ) : null}
    </SlideUpModal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
    search: {
      backgroundColor: theme.appMuted,
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.appText,
    },
    list: { maxHeight: 420 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.appBorder,
    },
    rowSelected: { backgroundColor: theme.appAccent },
    check: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.appBorderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    checkSelected: {
      borderColor: theme.main500,
      backgroundColor: theme.main500,
    },
    checkMark: { color: "#fff", fontSize: 12, fontWeight: "700" },
    rowBody: { flex: 1, minWidth: 0 },
    kanji: { fontSize: 16, fontWeight: "700", color: theme.appText },
    sub: { fontSize: 12, color: theme.appTextMuted, marginTop: 2 },
    empty: {
      textAlign: "center",
      color: theme.appTextMuted,
      padding: 32,
      fontSize: 14,
    },
    footer: {
      padding: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.appBorder,
    },
    confirmBtn: {
      backgroundColor: theme.main500,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    confirmBtnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
  });
}
