import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, ChevronDown, ChevronUp, Square, SquareCheck } from "lucide-react-native";
import { SlideUpModal } from "@/components/SlideUpModal";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { toggleListSort } from "@/lib/listSort";
import type { SortGroup, SortMode } from "@/lib/sortWords";

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

type SortOption = { value: SortMode; label: string; group: SortGroup };

type BaseProps = {
  visible: boolean;
  onClose: () => void;
  showJlptFilter?: boolean;
  selectedJlpt?: Set<string>;
  onToggleJlpt?: (level: string) => void;
  onClearJlpt?: () => void;
  showPageSize?: boolean;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
};

type SingleProps = BaseProps & {
  mode?: "single";
  sort: SortMode;
  onSortSelect: (value: SortMode) => void;
};

type MultiProps = BaseProps & {
  mode: "multi";
  activeSorts: Set<SortMode>;
  onActiveSortsChange: (sorts: Set<SortMode>) => void;
};

export type ListSortSheetProps = SingleProps | MultiProps;

export function ListSortSheet(props: ListSortSheetProps) {
  const {
    visible,
    onClose,
    showJlptFilter = false,
    selectedJlpt = new Set(),
    onToggleJlpt,
    onClearJlpt,
    showPageSize = false,
    pageSize = 50,
    onPageSizeChange,
  } = props;

  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [jlptExpanded, setJlptExpanded] = useState(false);

  useEffect(() => {
    if (!visible) setJlptExpanded(false);
  }, [visible]);

  const sortOptions: SortOption[] = [
    { value: "jlpt-asc", label: t("words.sort.jlptAsc"), group: "jlptOrder" },
    { value: "jlpt-desc", label: t("words.sort.jlptDesc"), group: "jlptOrder" },
    { value: "level-asc", label: t("words.sort.levelAsc"), group: "level" },
    { value: "level-desc", label: t("words.sort.levelDesc"), group: "level" },
    { value: "date-asc", label: t("words.sort.dateAsc"), group: "date" },
    { value: "date-desc", label: t("words.sort.dateDesc"), group: "date" },
    {
      value: "kanji-cluster",
      label: t("words.sort.kanjiCluster"),
      group: "kanji",
    },
  ];

  const groups: { key: SortGroup; label: string }[] = [
    { key: "jlptOrder", label: t("common.jlptOrder") },
    { key: "level", label: t("common.level") },
    { key: "date", label: t("common.date") },
    { key: "kanji", label: t("common.clustering") },
  ];

  const activeSortCount =
    props.mode === "multi" ? props.activeSorts.size : 0;

  const handleOptionPress = (value: SortMode) => {
    if (props.mode === "multi") {
      props.onActiveSortsChange(
        toggleListSort(props.activeSorts, value, sortOptions),
      );
    } else {
      props.onSortSelect(value);
      onClose();
    }
  };

  const isSelected = (value: SortMode) =>
    props.mode === "multi"
      ? props.activeSorts.has(value)
      : props.sort === value;

  return (
    <SlideUpModal
      visible={visible}
      onClose={onClose}
      title={t("common.sort")}
      maxHeight="75%"
    >
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {showPageSize && onPageSizeChange ? (
          <View style={styles.group}>
            <Text style={styles.groupLabel}>{t("words.filters.pageSize")}</Text>
            <View style={styles.pageSizeRow}>
              {PAGE_SIZE_OPTIONS.map((size) => {
                const selected = pageSize === size;
                return (
                  <Pressable
                    key={size}
                    onPress={() => onPageSizeChange(size)}
                    style={[
                      styles.pageSizeChip,
                      selected && styles.pageSizeChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pageSizeText,
                        selected && styles.pageSizeTextActive,
                      ]}
                    >
                      {size}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {showJlptFilter && onToggleJlpt && onClearJlpt ? (
          <View style={styles.group}>
            <Text style={styles.groupLabel}>{t("words.filters.jlpt")}</Text>
            <Pressable onPress={onClearJlpt} style={styles.option}>
              {selectedJlpt.size === 0 ? (
                <SquareCheck size={16} color={theme.main500} />
              ) : (
                <Square size={16} color={theme.appTextMuted} />
              )}
              <Text
                style={[
                  styles.optionText,
                  selectedJlpt.size === 0 && styles.optionTextSelected,
                ]}
              >
                {t("common.all")}
              </Text>
            </Pressable>
            {jlptExpanded
              ? JLPT_LEVELS.map((level) => {
                  const active = selectedJlpt.has(level);
                  return (
                    <Pressable
                      key={level}
                      onPress={() => onToggleJlpt(level)}
                      style={styles.option}
                    >
                      {active ? (
                        <SquareCheck size={16} color={theme.main500} />
                      ) : (
                        <Square size={16} color={theme.appTextMuted} />
                      )}
                      <Text
                        style={[
                          styles.optionText,
                          active && styles.optionTextSelected,
                        ]}
                      >
                        {level}
                      </Text>
                    </Pressable>
                  );
                })
              : null}
            <Pressable
              onPress={() => setJlptExpanded((v) => !v)}
              style={styles.jlptToggle}
            >
              {jlptExpanded ? (
                <ChevronUp size={16} color={theme.appTextMuted} />
              ) : (
                <ChevronDown size={16} color={theme.appTextMuted} />
              )}
            </Pressable>
          </View>
        ) : null}

        {groups.map((group) => {
          const options = sortOptions.filter((o) => o.group === group.key);
          if (options.length === 0) return null;
          return (
            <View key={group.key} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {options.map((opt) => {
                const selected = isSelected(opt.value);
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleOptionPress(opt.value)}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    {props.mode === "multi" ? (
                      selected ? (
                        <SquareCheck size={16} color={theme.main500} />
                      ) : (
                        <Square size={16} color={theme.appTextMuted} />
                      )
                    ) : selected ? (
                      <Check size={16} color={theme.main500} strokeWidth={2.5} />
                    ) : (
                      <View style={styles.checkPlaceholder} />
                    )}
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        {props.mode === "multi" && activeSortCount > 1 ? (
          <View style={styles.multiHint}>
            <Text style={styles.multiHintText}>
              {t("words.sort.multiCriteria", { count: activeSortCount })}
            </Text>
          </View>
        ) : null}

        {props.mode === "multi" ? (
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.doneBtnText}>{t("common.done")}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SlideUpModal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    scroll: {
      paddingHorizontal: 12,
    },
    group: {
      marginBottom: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.appBorder,
      paddingTop: 8,
    },
    groupLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
      color: theme.appTextMuted,
      paddingHorizontal: 8,
      marginBottom: 4,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 10,
    },
    optionSelected: {
      backgroundColor: theme.appAccent,
    },
    optionText: {
      fontSize: 14,
      color: theme.appTextSecondary,
      flex: 1,
    },
    optionTextSelected: {
      color: theme.main500,
      fontWeight: "600",
    },
    checkPlaceholder: {
      width: 16,
    },
    pageSizeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 8,
    },
    pageSizeChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.appMuted,
    },
    pageSizeChipActive: {
      backgroundColor: theme.main500,
    },
    pageSizeText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.appTextSecondary,
    },
    pageSizeTextActive: {
      color: "#fff",
    },
    jlptToggle: {
      alignItems: "center",
      paddingVertical: 6,
    },
    multiHint: {
      backgroundColor: theme.appAccent,
      borderRadius: 8,
      marginHorizontal: 8,
      marginBottom: 8,
      padding: 10,
    },
    multiHintText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.main500,
    },
    doneBtn: {
      marginHorizontal: 8,
      marginTop: 4,
      marginBottom: 8,
      backgroundColor: theme.main500,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    doneBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#fff",
    },
  });
}
