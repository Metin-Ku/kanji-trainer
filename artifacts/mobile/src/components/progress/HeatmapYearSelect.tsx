import { useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  type View as RNView,
} from "react-native";
import { ChevronDown } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  years: number[];
  value: number;
  currentYear: number;
  onChange: (year: number) => void;
};

type MenuPos = { top: number; right: number };

export function HeatmapYearSelect({
  years,
  value,
  currentYear,
  onChange,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const triggerRef = useRef<RNView>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos>({ top: 0, right: 20 });
  const isCurrentYear = value === currentYear;

  function openMenu() {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const screenW = Dimensions.get("window").width;
      setMenuPos({ top: y + height + 4, right: screenW - x - width });
      setOpen(true);
    });
  }

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          onPress={openMenu}
          style={({ pressed }) => [
            styles.trigger,
            isCurrentYear && styles.triggerCurrent,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text
            style={[
              styles.triggerText,
              isCurrentYear && styles.triggerTextCurrent,
            ]}
          >
            {String(value)}
          </Text>
          <ChevronDown
            size={14}
            color={isCurrentYear ? theme.main600 : theme.appText}
            strokeWidth={2.5}
          />
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.menu,
              { top: menuPos.top, right: menuPos.right },
            ]}
          >
            <ScrollView
              style={styles.menuScroll}
              bounces={false}
              keyboardShouldPersistTaps="never"
            >
              {years.map((y) => {
                const active = y === value;
                const current = y === currentYear;
                return (
                  <Pressable
                    key={y}
                    onPress={() => {
                      onChange(y);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      active && styles.optionActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        active && current && styles.optionTextCurrent,
                        active && !current && styles.optionTextActive,
                      ]}
                    >
                      {String(y)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    trigger: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: theme.appSurface,
      minWidth: 64,
    },
    triggerCurrent: {
      borderColor: theme.main400,
      backgroundColor: theme.appAccent,
    },
    triggerText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.appText,
    },
    triggerTextCurrent: {
      color: theme.main600,
    },
    backdrop: {
      flex: 1,
    },
    menu: {
      position: "absolute",
      minWidth: 88,
      maxHeight: 220,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      backgroundColor: theme.appSurface,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    menuScroll: {
      flexGrow: 0,
    },
    option: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.appBorder,
    },
    optionActive: {
      backgroundColor: theme.appMuted,
    },
    optionText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.appText,
      textAlign: "center",
    },
    optionTextActive: {
      color: theme.appText,
    },
    optionTextCurrent: {
      color: theme.main600,
    },
  });
}
