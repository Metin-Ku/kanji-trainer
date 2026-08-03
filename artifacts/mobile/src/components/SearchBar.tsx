import { useRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Search, X } from "lucide-react-native";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { useInputFocusRing } from "@/components/FocusRingInput";
import { LoadingSpinner } from "./LoadingSpinner";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  wordCount?: number;
  wordCountLoading?: boolean;
  onWordCountClick?: () => void;
};

export function SearchBar({
  value,
  onChange,
  placeholder = "",
  wordCount,
  wordCountLoading = false,
  onWordCountClick,
}: Props) {
  const { t } = useTranslation();
  const { theme, colorScheme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const { focused, focusAccent, ringElement, onFocus, onBlur, borderColor } =
    useInputFocusRing(8);

  const countBg = colorScheme === "dark" ? theme.main600 : theme.main500;
  const countText = colorScheme === "dark" ? theme.appText : theme.white;

  return (
    <View style={styles.wrap}>
      <Search
        size={17}
        color={focused ? focusAccent : theme.appTextSecondary}
        style={styles.searchIcon}
      />
      {ringElement}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.appTextMuted}
        onFocus={onFocus}
        onBlur={onBlur}
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBg,
            color: theme.appText,
            borderColor,
          },
        ]}
      />
      {!value && wordCount !== undefined && onWordCountClick ? (
        <Pressable
          onPress={onWordCountClick}
          disabled={wordCountLoading}
          style={({ pressed }) => [
            styles.countBadge,
            { backgroundColor: countBg },
            pressed && styles.countBadgePressed,
          ]}
        >
          {wordCountLoading ? (
            <LoadingSpinner size={14} color={countText} />
          ) : (
            <Text style={[styles.countBadgeText, { color: countText }]}>
              {t("common.wordCount", { count: wordCount })}
            </Text>
          )}
        </Pressable>
      ) : null}
      {value ? (
        <Pressable
          onPress={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          style={({ pressed }) => [
            styles.clearBtn,
            { backgroundColor: theme.danger },
            pressed && { opacity: 0.85 },
          ]}
        >
          <X size={13} color={theme.white} strokeWidth={3} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    justifyContent: "center",
  },
  searchIcon: {
    position: "absolute",
    left: 10,
    zIndex: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingLeft: 32,
    paddingRight: 88,
    fontSize: 14,
  },
  countBadge: {
    position: "absolute",
    right: 6,
    height: 25,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  countBadgePressed: {
    opacity: 0.85,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  clearBtn: {
    position: "absolute",
    right: 6,
    width: 42,
    height: 25,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
});
