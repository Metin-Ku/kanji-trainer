import { Keyboard, Pressable, StyleSheet, type ViewProps } from "react-native";

/** Tap outside focused fields to dismiss the keyboard. Wrap screen roots. */
export function DismissKeyboardView({
  children,
  style,
  ...rest
}: ViewProps) {
  return (
    <Pressable
      style={[styles.flex, style]}
      onPress={Keyboard.dismiss}
      accessible={false}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

/** Use on ScrollView / FlatList so taps outside TextInput blur the field. */
export const KEYBOARD_DISMISS_TAPS = "never" as const;
