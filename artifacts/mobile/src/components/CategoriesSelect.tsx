import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ChevronDown, Square, SquareCheck, X } from "lucide-react-native";
import type { CategorySummary } from "@/hooks/useCategories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { SlideUpModal } from "@/components/SlideUpModal";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  categories: CategorySummary[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
};

export function CategoriesSelect({ categories, selectedIds, onChange }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = categories.filter((c) => selectedIds.includes(c.id));
  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function toggleCategory(id: number) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((sid) => sid !== id)
        : [...selectedIds, id],
    );
  }

  function removeCategory(id: number) {
    onChange(selectedIds.filter((sid) => sid !== id));
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.triggerBody}>
          {selected.length > 0 ? (
            <View style={styles.chipsRow}>
              {selected.map((cat) => (
                <View key={cat.id} style={styles.chip}>
                  <CategoryIcon svg={cat.iconSvg} size={14} />
                  <Text style={styles.chipText} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.();
                      removeCategory(cat.id);
                    }}
                    hitSlop={6}
                  >
                    <X size={12} color={theme.main600 ?? theme.main500} strokeWidth={2.5} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.placeholder}>{t("categories.selectPlaceholder")}</Text>
          )}
        </View>
        <ChevronDown size={18} color={theme.appTextMuted} />
      </Pressable>

      <SlideUpModal
        visible={open}
        onClose={() => {
          setOpen(false);
          setQuery("");
        }}
        title={t("wordForm.labels.categories")}
        maxHeight="70%"
      >
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("categories.searchPlaceholder")}
            placeholderTextColor={theme.appTextMuted}
            style={styles.search}
            autoCorrect={false}
          />
        </View>
        <ScrollView style={styles.list} keyboardShouldPersistTaps="never">
          {filtered.length === 0 ? (
            <Text style={styles.empty}>
              {t("categories.selectNotFound", { query })}
            </Text>
          ) : (
            filtered.map((cat) => {
              const active = selectedIds.includes(cat.id);
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => toggleCategory(cat.id)}
                  style={({ pressed }) => [
                    styles.option,
                    active && styles.optionActive,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  {active ? (
                    <SquareCheck size={18} color={theme.main500} />
                  ) : (
                    <Square size={18} color={theme.appTextMuted} />
                  )}
                  <CategoryIcon svg={cat.iconSvg} size={18} />
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {cat.name}
                  </Text>
                  <Text style={styles.count}>{cat.wordCount}</Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
        <Pressable
          onPress={() => {
            setOpen(false);
            setQuery("");
          }}
          style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.doneBtnText}>{t("common.done")}</Text>
        </Pressable>
      </SlideUpModal>
    </>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    trigger: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 44,
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      borderRadius: 10,
      backgroundColor: theme.appSurface,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    triggerBody: { flex: 1, minWidth: 0 },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      maxWidth: "100%",
      backgroundColor: theme.appAccent,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    chipText: {
      flexShrink: 1,
      fontSize: 12,
      fontWeight: "600",
      color: theme.main600 ?? theme.main500,
    },
    placeholder: {
      fontSize: 15,
      color: theme.appTextMuted,
    },
    searchWrap: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
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
    list: {
      maxHeight: 320,
      paddingHorizontal: 12,
    },
    empty: {
      textAlign: "center",
      color: theme.appTextMuted,
      fontSize: 13,
      paddingVertical: 24,
      paddingHorizontal: 12,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 10,
      marginBottom: 4,
    },
    optionActive: {
      backgroundColor: theme.appAccent,
    },
    optionText: {
      flex: 1,
      fontSize: 14,
      color: theme.appTextSecondary,
    },
    optionTextActive: {
      color: theme.main500,
      fontWeight: "600",
    },
    count: {
      fontSize: 11,
      color: theme.appTextMuted,
    },
    doneBtn: {
      marginHorizontal: 16,
      marginTop: 8,
      backgroundColor: theme.main500,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    doneBtnText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
