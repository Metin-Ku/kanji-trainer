import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Copy, Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";

const FAB_SIZE = 52;
const FAB_OPEN_HEIGHT = 158;
const DIVIDER_WIDTH = 28;

type Props = {
  onNewWord: () => void;
  onBulkImport: () => void;
};

function FabDivider() {
  return <View style={styles.divider} />;
}

export function WordAddFab({ onNewWord, onBulkImport }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const heightAnim = useRef(new Animated.Value(FAB_SIZE)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: open ? FAB_OPEN_HEIGHT : FAB_SIZE,
        duration: 140,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue: open ? 1 : 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, heightAnim, rotateAnim]);

  const close = () => setOpen(false);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const wrapStyle = useMemo(
    () => ({
      shadowColor: theme.main600,
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 } as const,
      elevation: 6,
    }),
    [theme.main600],
  );

  return (
    <>
      {open ? <Pressable style={styles.backdrop} onPress={close} /> : null}
      <View
        style={[
          styles.wrap,
          wrapStyle,
          { bottom: Math.max(insets.bottom, 16) + 16 },
        ]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[styles.pill, { height: heightAnim, width: FAB_SIZE }]}
        >
          <View style={styles.gradientLayer} pointerEvents="none">
            <Svg width={FAB_SIZE} height={FAB_OPEN_HEIGHT}>
              <Defs>
                <LinearGradient id="fabGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={theme.main400} />
                  <Stop offset="1" stopColor={theme.main600} />
                </LinearGradient>
              </Defs>
              <Rect
                x={0}
                y={0}
                width={FAB_SIZE}
                height={FAB_OPEN_HEIGHT}
                rx={FAB_SIZE / 2}
                fill="url(#fabGrad)"
              />
            </Svg>
          </View>

          {/* Anchor actions to bottom so collapsed state shows the toggle (+). */}
          <View style={styles.stack}>
            <Pressable
              onPress={() => setOpen((v) => !v)}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
            >
              <Animated.View style={{ transform: [{ rotate }] }}>
                <Plus size={22} color="#fff" strokeWidth={2.5} />
              </Animated.View>
            </Pressable>

            <FabDivider />

            <Pressable
              onPress={() => {
                close();
                onNewWord();
              }}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
            >
              <Plus size={22} color="#fff" strokeWidth={2.5} />
            </Pressable>

            <FabDivider />

            <Pressable
              onPress={() => {
                close();
                onBulkImport();
              }}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
            >
              <Copy size={19} color="#fff" strokeWidth={2} />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  wrap: {
    position: "absolute",
    right: 20,
    zIndex: 40,
  },
  pill: {
    borderRadius: FAB_SIZE / 2,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
    bottom: 0,
    height: FAB_OPEN_HEIGHT,
  },
  stack: {
    flexDirection: "column-reverse",
    alignItems: "center",
  },
  actionBtn: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  divider: {
    width: DIVIDER_WIDTH,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    flexShrink: 0,
  },
});
