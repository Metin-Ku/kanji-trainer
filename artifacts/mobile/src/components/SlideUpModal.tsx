import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const DISMISS_DRAG = 72;
const DISMISS_VELOCITY = 900;

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  maxHeight?: ViewStyle["maxHeight"];
  bottomInset?: number;
  /** Overlay inside parent (e.g. above SRS rating bar) instead of RN Modal. */
  inline?: boolean;
  scrollable?: boolean;
};

export function SlideUpModal({
  visible,
  onClose,
  children,
  title,
  maxHeight = "85%",
  bottomInset = 0,
  inline = false,
  scrollable = false,
}: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const finishHide = useCallback(() => {
    setMounted(false);
  }, []);

  const animateIn = useCallback(() => {
    backdropOpacity.value = withTiming(1, { duration: 220 });
    translateY.value = withTiming(0, { duration: 320 });
  }, [backdropOpacity, translateY]);

  const animateOut = useCallback(
    (after?: () => void) => {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 260 }, (done) => {
        if (done) {
          runOnJS(finishHide)();
          if (after) runOnJS(after)();
        }
      });
    },
    [backdropOpacity, finishHide, translateY],
  );

  useEffect(() => {
    if (visible) {
      setMounted(true);
      requestAnimationFrame(() => animateIn());
    } else if (mounted) {
      animateOut();
    }
  }, [visible, mounted, animateIn, animateOut]);

  const requestClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DRAG || e.velocityY > DISMISS_VELOCITY) {
        runOnJS(requestClose)();
      } else {
        translateY.value = withTiming(0, { duration: 220 });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted) return null;

  const body = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  const sheet = (
    <Animated.View
      style={[
        styles.sheet,
        sheetStyle,
        {
          maxHeight,
          paddingBottom: Math.max(insets.bottom, 12),
          marginBottom: bottomInset,
        },
      ]}
    >
      <GestureDetector gesture={panGesture}>
        <View style={styles.handleArea}>
          <Pressable onPress={requestClose} style={styles.handlePress}>
            <View style={styles.handle} />
          </Pressable>
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>
      </GestureDetector>
      {body}
    </Animated.View>
  );

  const backdrop = (
    <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="auto">
      <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
    </Animated.View>
  );

  if (inline) {
    return (
      <View style={styles.inlineRoot} pointerEvents="box-none">
        <Animated.View
          style={[styles.backdrop, backdropStyle, bottomInset > 0 && { bottom: bottomInset }]}
          pointerEvents="auto"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
        </Animated.View>
        <View style={[styles.inlineSheetHost, { bottom: bottomInset }]} pointerEvents="box-none">
          {sheet}
        </View>
      </View>
    );
  }

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={requestClose}>
      <View style={styles.modalRoot}>
        {backdrop}
        <View style={styles.sheetHost} pointerEvents="box-none">
          {sheet}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    modalRoot: {
      flex: 1,
      justifyContent: "flex-end",
    },
    inlineRoot: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 30,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheetHost: {
      flex: 1,
      justifyContent: "flex-end",
    },
    inlineSheetHost: {
      position: "absolute",
      left: 0,
      right: 0,
    },
    sheet: {
      backgroundColor: theme.appSurface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: theme.appBorder,
      overflow: "hidden",
    },
    handleArea: {
      paddingBottom: 4,
    },
    handlePress: {
      alignItems: "center",
      paddingTop: 10,
      paddingBottom: 8,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 999,
      backgroundColor: theme.appBorderStrong,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.appText,
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingBottom: 8,
    },
  });
}
