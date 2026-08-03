import { View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { LoadingSpinner } from "./LoadingSpinner";

type Props = {
  size?: number;
  color?: string;
  /** Minimum vertical padding around the spinner */
  padding?: "sm" | "md" | "lg";
  style?: ViewStyle | ViewStyle[];
};

const PADDING_Y = {
  sm: 32,
  md: 64,
  lg: 96,
} as const;

export function LoadingPlaceholder({
  size = 32,
  color,
  padding = "md",
  style,
}: Props) {
  const { theme, colorScheme } = useTheme();
  const spinnerColor =
    color ?? (colorScheme === "dark" ? theme.main500 : theme.main400);

  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: PADDING_Y[padding],
        },
        style,
      ]}
    >
      <LoadingSpinner size={size} color={spinnerColor} />
    </View>
  );
}
