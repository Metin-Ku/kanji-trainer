import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, Plus } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingPlaceholder } from "@/components/LoadingPlaceholder";
import { WordPickerSheet } from "@/components/WordPickerSheet";
import { useThemes } from "@/hooks/useThemes";
import { useWords } from "@/hooks/useWords";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";

export default function ThemesHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { themes, isLoading, createTheme } = useThemes();
  const { words } = useWords();

  const [showCreate, setShowCreate] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [name, setName] = useState("");
  const [pickerIds, setPickerIds] = useState<Set<number>>(() => new Set());
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const created = await createTheme({
        name: name.trim(),
        wordIds: [...pickerIds],
      });
      setShowCreate(false);
      setShowPicker(false);
      setName("");
      setPickerIds(new Set());
      router.push({ pathname: "/themes/[id]", params: { id: created.id } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <ArrowLeft size={18} color={theme.appTextMuted} />
          <Text style={styles.backTitle}>{t("nav.themes")}</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setName("");
            setPickerIds(new Set());
            setShowCreate(true);
          }}
          style={styles.addBtn}
        >
          <Plus size={20} color={theme.main500} />
        </Pressable>
      </View>

      <Text style={styles.pageTitle}>{t("themes.title")}</Text>
      <Text style={styles.subtitle}>{t("themes.subtitle")}</Text>

      {isLoading ? (
        <LoadingPlaceholder padding="lg" style={styles.center} />
      ) : (
        <FlatList
          data={themes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.empty}>{t("themes.empty")}</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({ pathname: "/themes/[id]", params: { id: item.id } })
              }
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {t("themes.meta", {
                    words: item.wordCount,
                    questions: item.questionCount ?? 0,
                  })}
                </Text>
              </View>
              <ChevronRight size={18} color={theme.appTextMuted} />
            </Pressable>
          )}
        />
      )}

      <Modal visible={showCreate} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCreate(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t("themes.newTheme")}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("themes.namePlaceholder")}
              placeholderTextColor={theme.appTextMuted}
              style={styles.input}
            />
            <Pressable
              onPress={() => setShowPicker(true)}
              style={styles.outlineBtn}
            >
              <Text style={styles.outlineBtnText}>
                {t("themes.selectedWordCount", { count: pickerIds.size })}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleCreate}
              disabled={!name.trim() || saving}
              style={[styles.primaryBtn, (!name.trim() || saving) && styles.disabledBtn]}
            >
              <Text style={styles.primaryBtnText}>{t("common.create")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <WordPickerSheet
        visible={showPicker}
        words={words}
        selectedIds={pickerIds}
        onToggle={(wid) => {
          setPickerIds((prev) => {
            const next = new Set(prev);
            if (next.has(wid)) next.delete(wid);
            else next.add(wid);
            return next;
          });
        }}
        onClose={() => setShowPicker(false)}
        title={t("themes.pickWords")}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.appBg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    backRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 4 },
    backTitle: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: theme.main400,
    },
    addBtn: { padding: 8 },
    pageTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.appText,
      paddingHorizontal: 20,
      marginTop: 8,
    },
    subtitle: {
      fontSize: 14,
      color: theme.appTextSecondary,
      paddingHorizontal: 20,
      marginTop: 4,
      marginBottom: 12,
    },
    listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: theme.appSurface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.appBorder,
      borderRadius: 16,
      padding: 16,
    },
    cardBody: { flex: 1, minWidth: 0 },
    cardTitle: { fontSize: 17, fontWeight: "700", color: theme.appText },
    cardMeta: { fontSize: 12, color: theme.appTextMuted, marginTop: 2 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: {
      textAlign: "center",
      color: theme.appTextMuted,
      padding: 40,
      fontSize: 14,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      padding: 24,
    },
    modalSheet: {
      backgroundColor: theme.appSurface,
      borderRadius: 16,
      padding: 20,
      gap: 12,
    },
    modalTitle: { fontSize: 17, fontWeight: "700", color: theme.appText },
    input: {
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.appText,
      backgroundColor: theme.appMuted,
    },
    outlineBtn: {
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    outlineBtnText: { fontSize: 14, fontWeight: "600", color: theme.main500 },
    primaryBtn: {
      backgroundColor: theme.main500,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    disabledBtn: { opacity: 0.5 },
  });
}
