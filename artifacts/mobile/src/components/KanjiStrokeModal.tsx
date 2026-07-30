import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
} from "lucide-react-native";
import { LoadingSpinner } from "./LoadingSpinner";
import {
  STROKE_DELAY_MS,
  STROKE_DURATION_MS,
  estimatePathLength,
  getKanjiChars,
  loadKanjiVgSvg,
  parseKanjiVgSvg,
  strokeGradientColor,
} from "@/lib/kanjiVg";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

type Props = {
  kanji: string;
  visible: boolean;
  onClose: () => void;
  variant?: "modal" | "sheet";
};

function AnimatedStrokePath({
  d,
  color,
  index,
  replayKey,
  dashLength,
}: {
  d: string;
  color: string;
  index: number;
  replayKey: number;
  dashLength: number;
}) {
  const offset = useSharedValue(dashLength);

  useEffect(() => {
    offset.value = dashLength;
    offset.value = withDelay(
      index * STROKE_DELAY_MS,
      withTiming(0, {
        duration: STROKE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [d, index, replayKey, offset, dashLength]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dashLength}
      animatedProps={animatedProps}
    />
  );
}

function AnimatedStrokeNumber({
  x,
  y,
  text,
  fill,
  index,
  replayKey,
}: {
  x: number;
  y: number;
  text: string;
  fill: string;
  index: number;
  replayKey: number;
}) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withDelay(
      index * STROKE_DELAY_MS + STROKE_DURATION_MS,
      withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }),
    );
  }, [index, replayKey, opacity]);

  const animatedProps = useAnimatedProps(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedSvgText
      x={x}
      y={y}
      fill={fill}
      fontSize={9}
      fontWeight="bold"
      animatedProps={animatedProps}
    >
      {text}
    </AnimatedSvgText>
  );
}

function KanjiStrokeCanvas({
  paths,
  numbers,
  colors,
  replayKey,
}: {
  paths: string[];
  numbers: { x: number; y: number; text: string }[];
  colors: string[];
  replayKey: number;
}) {
  const dashLengths = useMemo(
    () => paths.map((d) => estimatePathLength(d)),
    [paths],
  );

  return (
    <Svg width={216} height={216} viewBox="0 0 109 109">
      {paths.map((d, i) => (
        <AnimatedStrokePath
          key={`p-${i}-${replayKey}`}
          d={d}
          color={colors[i] ?? colors[colors.length - 1] ?? "#333"}
          index={i}
          replayKey={replayKey}
          dashLength={dashLengths[i] ?? 120}
        />
      ))}
      {numbers.map((num, i) => (
        <AnimatedStrokeNumber
          key={`n-${i}-${replayKey}`}
          x={num.x}
          y={num.y}
          text={num.text}
          fill={colors[i] ?? colors[colors.length - 1] ?? "#333"}
          index={i}
          replayKey={replayKey}
        />
      ))}
    </Svg>
  );
}

export function KanjiStrokeModal({
  kanji,
  visible,
  onClose,
  variant = "modal",
}: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const chars = useMemo(() => getKanjiChars(kanji), [kanji]);
  const [charIndex, setCharIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [parsed, setParsed] = useState<ReturnType<typeof parseKanjiVgSvg> | null>(
    null,
  );
  const [replayKey, setReplayKey] = useState(0);

  const currentChar = chars[charIndex] ?? "";

  const runAnimation = useCallback(() => {
    setReplayKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!visible || !currentChar) return;

    let cancelled = false;
    setLoading(true);
    setError(false);
    setParsed(null);

    loadKanjiVgSvg(currentChar)
      .then((svg) => {
        if (cancelled) return;
        const data = parseKanjiVgSvg(svg);
        if (data.paths.length === 0) throw new Error("empty");
        setParsed(data);
        setReplayKey((k) => k + 1);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, currentChar]);

  useEffect(() => {
    if (!visible) setCharIndex(0);
  }, [visible, kanji]);

  if (chars.length === 0) return null;

  const strokeCount = parsed?.paths.length ?? 0;
  const strokeColors = Array.from({ length: strokeCount }, (_, i) =>
    strokeGradientColor(i, strokeCount, theme.main400, theme.main600),
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, variant === "sheet" && styles.backdropSheet]}
        onPress={onClose}
      >
        <Pressable
          style={[styles.sheet, variant === "sheet" && styles.sheetBottom]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("kanjiStroke.title")}</Text>
            <View style={styles.headerActions}>
              {parsed && !loading ? (
                <Pressable
                  onPress={runAnimation}
                  hitSlop={8}
                  style={({ pressed }) => pressed && { opacity: 0.7 }}
                >
                  <RefreshCw size={13} color={theme.appTextMuted} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <X size={16} color={theme.appTextMuted} />
              </Pressable>
            </View>
          </View>

          {chars.length > 1 ? (
            <View style={styles.charPicker}>
              <Pressable
                onPress={() => setCharIndex((i) => Math.max(0, i - 1))}
                disabled={charIndex === 0}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <ChevronLeft
                  size={16}
                  color={charIndex === 0 ? theme.appBorderStrong : theme.appTextMuted}
                />
              </Pressable>
              {chars.map((c, i) => (
                <Pressable
                  key={`${c}-${i}`}
                  onPress={() => setCharIndex(i)}
                  style={[
                    styles.charBtn,
                    i === charIndex && styles.charBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.charBtnText,
                      i === charIndex && styles.charBtnTextActive,
                    ]}
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() =>
                  setCharIndex((i) => Math.min(chars.length - 1, i + 1))
                }
                disabled={charIndex === chars.length - 1}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <ChevronRight
                  size={16}
                  color={
                    charIndex === chars.length - 1
                      ? theme.appBorderStrong
                      : theme.appTextMuted
                  }
                />
              </Pressable>
            </View>
          ) : (
            <View style={styles.singleCharWrap}>
              <Text style={styles.singleChar}>{currentChar}</Text>
            </View>
          )}

          <View style={styles.svgArea}>
            {loading ? (
              <LoadingSpinner size={32} color={theme.appTextMuted} />
            ) : error ? (
              <View style={styles.errorWrap}>
                <Text style={styles.errorChar}>{currentChar}</Text>
                <Text style={styles.errorText}>{t("kanjiStroke.svgNotFound")}</Text>
              </View>
            ) : parsed && parsed.paths.length > 0 ? (
              <KanjiStrokeCanvas
                key={currentChar}
                paths={parsed.paths}
                numbers={parsed.numbers}
                colors={strokeColors}
                replayKey={replayKey}
              />
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    backdropSheet: {
      justifyContent: "flex-end",
      padding: 0,
    },
    sheet: {
      width: 296,
      backgroundColor: theme.appSurface,
      borderRadius: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    sheetBottom: {
      width: "100%",
      maxWidth: 420,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 2,
      textTransform: "uppercase",
      color: theme.appTextMuted,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    charPicker: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    charBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    charBtnActive: {
      backgroundColor: theme.main500,
    },
    charBtnText: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.appTextMuted,
    },
    charBtnTextActive: {
      color: "#fff",
    },
    singleCharWrap: {
      alignItems: "center",
      paddingBottom: 4,
    },
    singleChar: {
      fontSize: 48,
      fontWeight: "700",
      color: theme.appText,
    },
    svgArea: {
      marginHorizontal: 16,
      marginBottom: 16,
      height: 248,
      borderRadius: 12,
      backgroundColor: theme.colorScheme === "dark" ? theme.appMuted : "#f9f9f9",
      alignItems: "center",
      justifyContent: "center",
    },
    errorWrap: {
      alignItems: "center",
      paddingHorizontal: 24,
    },
    errorChar: {
      fontSize: 32,
      color: theme.appBorderStrong,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 12,
      color: theme.appTextMuted,
      textAlign: "center",
    },
  });
}
