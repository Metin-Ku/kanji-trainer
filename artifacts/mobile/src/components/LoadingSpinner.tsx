import { ActivityIndicator, View, type ViewStyle } from "react-native";
import { defaultTheme } from "@/theme/buildTheme";

type Props = {
  size?: number;
  color?: string;
  style?: ViewStyle;
};

export function LoadingSpinner({
  size = 24,
  color = defaultTheme.main500,
  style,
}: Props) {
  return (
    <View style={style}>
      <ActivityIndicator size={size > 28 ? "large" : "small"} color={color} />
    </View>
  );
}
