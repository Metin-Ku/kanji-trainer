import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";

type Props = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
  /** Renders Eye / EyeOff toggle on the right (password fields). */
  passwordToggle?: boolean;
};

export function FocusRingInput({
  containerStyle,
  borderRadius = 12,
  passwordToggle = false,
  secureTextEntry,
  style,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const { theme, colorScheme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const ringOpacity = useRef(new Animated.Value(0)).current;

  const focusAccent =
    colorScheme === "dark" ? theme.main500 : theme.main400;

  useEffect(() => {
    Animated.timing(ringOpacity, {
      toValue: focused ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [focused, ringOpacity]);

  const isSecure = passwordToggle ? !showPassword : secureTextEntry;

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            borderRadius,
            opacity: ringOpacity,
            borderColor: focusAccent,
          },
        ]}
      />
      <TextInput
        ref={inputRef}
        {...rest}
        secureTextEntry={isSecure}
        placeholderTextColor={theme.appTextMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            borderRadius,
            backgroundColor: theme.appSurface,
            color: theme.appText,
            borderColor: focused ? focusAccent : theme.appBorderStrong,
            paddingRight: passwordToggle ? 48 : 12,
          },
          style,
        ]}
      />
      {passwordToggle ? (
        <Pressable
          onPress={() => {
            setShowPassword((prev) => !prev);
            inputRef.current?.focus();
          }}
          hitSlop={8}
          style={styles.eyeBtn}
          accessibilityRole="button"
        >
          {showPassword ? (
            <EyeOff
              size={22}
              color={focused ? focusAccent : theme.appTextMuted}
              strokeWidth={2}
            />
          ) : (
            <Eye
              size={22}
              color={focused ? focusAccent : theme.appTextMuted}
              strokeWidth={2}
            />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

/** Shared inset focus ring styles for custom inputs (e.g. SearchBar). */
export function useInputFocusRing(borderRadius = 8) {
  const { theme, colorScheme } = useTheme();
  const [focused, setFocused] = useState(false);
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const focusAccent =
    colorScheme === "dark" ? theme.main500 : theme.main400;

  useEffect(() => {
    Animated.timing(ringOpacity, {
      toValue: focused ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [focused, ringOpacity]);

  const ringElement = (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          borderWidth: 2,
          borderRadius,
          zIndex: 1,
          opacity: ringOpacity,
          borderColor: focusAccent,
        },
      ]}
    />
  );

  return {
    focused,
    focusAccent,
    ringElement,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    borderColor: focused ? focusAccent : theme.appBorderStrong,
  };
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    justifyContent: "center",
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2.5,
    zIndex: 1,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    zIndex: 2,
    padding: 4,
  },
});
