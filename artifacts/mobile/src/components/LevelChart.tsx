import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";

const HEIGHTS = [28, 42, 56, 72, 88];

type Props = {
  level: number;
  starred?: boolean;
  onChangeLevel: (level: number) => void;
  onToggleStar?: () => void;
};

export function LevelChart({
  level,
  starred = false,
  onChangeLevel,
  onToggleStar,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const starEnabled = level === 5 || starred;

  return (
    <View>
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          setOpen(true);
        }}
        hitSlop={6}
        style={styles.barsRow}
        accessibilityLabel={t("a11y.changeLevel")}
      >
        {[1, 2, 3, 4, 5].map((bar) => {
          const pct = HEIGHTS[bar - 1]!;
          return (
            <View
              key={bar}
              style={{
                width: 3,
                height: (pct / 100) * 15,
                backgroundColor: theme.levelColor(bar, level),
                borderTopLeftRadius: 1,
                borderTopRightRadius: 1,
              }}
            />
          );
        })}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.menu,
              {
                backgroundColor: theme.appSurface,
                borderColor: theme.appBorder,
              },
            ]}
            onPress={(e) => e.stopPropagation?.()}
          >
            <Text style={[styles.menuTitle, { color: theme.appTextMuted }]}>
              {t("levelChart.title")}
            </Text>
            <View style={styles.levelRow}>
              {[1, 2, 3, 4, 5].map((l) => {
                const active = l === level;
                const color = theme.levelColor(l, l);
                return (
                  <Pressable
                    key={l}
                    onPress={() => {
                      onChangeLevel(l);
                      setOpen(false);
                    }}
                    style={[
                      styles.levelBtn,
                      {
                        backgroundColor: active ? color : "transparent",
                        borderColor: active ? color : theme.appBorderStrong,
                      },
                      active && styles.levelBtnActive,
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? theme.white : theme.appTextSecondary,
                        fontWeight: "600",
                        fontSize: 14,
                      }}
                    >
                      {l}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                disabled={!starEnabled}
                onPress={() => {
                  if (starEnabled && onToggleStar) {
                    onToggleStar();
                    setOpen(false);
                  }
                }}
                style={[
                  styles.levelBtn,
                  {
                    backgroundColor: starred ? theme.starColor : "transparent",
                    borderColor: starred
                      ? theme.starColor
                      : starEnabled
                        ? theme.starColor
                        : theme.appBorderStrong,
                    opacity: starEnabled ? 1 : 0.4,
                  },
                ]}
                accessibilityLabel={
                  starred ? t("a11y.unmarkLearned") : t("a11y.markLearned")
                }
              >
                <Text
                  style={{
                    color: starred ? theme.white : theme.starColor,
                    fontSize: 16,
                  }}
                >
                  ★
                </Text>
              </Pressable>
            </View>
            {!starEnabled ? (
              <Text style={[styles.hint, { color: theme.appTextMuted }]}>
                {t("levelChart.starAtLevel5Hint")}
              </Text>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1,
    height: 17,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  menu: {
    width: "100%",
    maxWidth: 280,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  menuTitle: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 10,
  },
  levelRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  levelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  levelBtnActive: {
    transform: [{ scale: 1.1 }],
  },
  hint: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 10,
  },
});
