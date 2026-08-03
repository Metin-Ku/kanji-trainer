import { useEffect } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  /** Width and height in pixels */
  size?: number;
  color?: string;
  style?: ViewStyle | ViewStyle[];
};

const STEP_MS = 500;
const DOT_CX = [4, 12, 20] as const;

function ChaseDot({
  index,
  size,
  color,
}: {
  index: number;
  size: number;
  color: string;
}) {
  const tick = useSharedValue(index === 0 ? 0 : -index);

  const r = (size / 24) * 3;
  const x0 = (DOT_CX[0]! / 24) * size;
  const x1 = (DOT_CX[1]! / 24) * size;
  const x2 = (DOT_CX[2]! / 24) * size;

  useEffect(() => {
    tick.value = withDelay(
      index * STEP_MS,
      withRepeat(
        withTiming(4, { duration: STEP_MS * 4, easing: Easing.linear }),
        -1,
        false,
      ),
    );
  }, [index, tick]);

  const animStyle = useAnimatedStyle(() => {
    const p = ((tick.value % 4) + 4) % 4;
    let cx = x0;
    let s = 0;

    if (p < 0.5) {
      s = interpolate(p, [0, 0.5], [0, 1], Extrapolation.CLAMP);
      cx = x0;
    } else if (p < 1.5) {
      s = 1;
      cx = interpolate(p, [0.5, 1.5], [x0, x1], Extrapolation.CLAMP);
    } else if (p < 2.5) {
      s = 1;
      cx = interpolate(p, [1.5, 2.5], [x1, x2], Extrapolation.CLAMP);
    } else if (p < 3.5) {
      s = interpolate(p, [2.5, 3.5], [1, 0], Extrapolation.CLAMP);
      cx = x2;
    } else {
      s = 0;
      cx = x0;
    }

    return {
      position: "absolute" as const,
      left: cx - r,
      top: size / 2 - r,
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      backgroundColor: color,
      transform: [{ scale: Math.max(s, 0.001) }],
      opacity: s,
    };
  });

  return <Animated.View style={animStyle} />;
}

export function LoadingSpinner({
  size = 24,
  color,
  style,
}: Props) {
  const { theme, colorScheme } = useTheme();
  const fill =
    color ?? (colorScheme === "dark" ? theme.main500 : theme.main400);

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      {[0, 1, 2].map((index) => (
        <ChaseDot key={index} index={index} size={size} color={fill} />
      ))}
    </View>
  );
}
