import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Search, X } from "lucide-react-native";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
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
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(ringOpacity, {
      toValue: focused ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [focused, ringOpacity]);

  return (
    <View style={styles.wrap}>
      <Search
        size={17}
        color={focused ? theme.main400 : theme.appTextSecondary}
        style={styles.searchIcon}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.focusRing,
          {
            opacity: ringOpacity,
            borderColor: theme.main400,
          },
        ]}
      />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.appTextMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBg,
            color: theme.appText,
            borderColor: focused ? theme.main400 : theme.appBorderStrong,
          },
        ]}
      />
      {!value && wordCount !== undefined && onWordCountClick ? (
        <Pressable
          onPress={onWordCountClick}
          disabled={wordCountLoading}
          style={({ pressed }) => [
            styles.countBadge,
            { backgroundColor: theme.main500 },
            pressed && styles.countBadgePressed,
          ]}
        >
          {wordCountLoading ? (
            <LoadingSpinner size={14} color={theme.white} />
          ) : (
            <Text style={[styles.countBadgeText, { color: theme.white }]}>
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
  focusRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: 8,
    zIndex: 1,
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
