import { StyleSheet, Text, View } from "react-native";
import type { TargetChunk } from "@/lib/types";
import { useTheme } from "@/theme/ThemeProvider";

/** Render inline ruby with furigana above kanji. */
export function RubyInline({
  base,
  reading,
  textStyle,
  readingStyle,
}: {
  base: string;
  reading?: string;
  textStyle?: object;
  readingStyle?: object;
}) {
  const { theme } = useTheme();
  if (!reading) {
    return <Text style={textStyle}>{base}</Text>;
  }
  return (
    <View style={styles.rubyWrap}>
      <Text
        style={[
          styles.rubyReading,
          { color: theme.appTextSecondary },
          readingStyle,
        ]}
      >
        {reading}
      </Text>
      <Text style={[styles.rubyBase, textStyle]}>{base}</Text>
    </View>
  );
}

export function RubyParts({
  parts,
  textStyle,
  readingStyle,
}: {
  parts: { base: string; reading?: string }[];
  textStyle?: object;
  readingStyle?: object;
}) {
  return (
    <>
      {parts.map((p, i) => (
        <RubyInline
          key={i}
          base={p.base}
          reading={p.reading}
          textStyle={textStyle}
          readingStyle={readingStyle}
        />
      ))}
    </>
  );
}

export function HiddenAnswerDisplay({
  expected,
  input,
  mode,
  liveInput,
  ruby,
  textStyle,
}: {
  expected: string;
  input: string;
  mode: "live" | "correct" | "partial" | "revealed";
  liveInput?: string;
  ruby?: TargetChunk["ruby"];
  textStyle?: object;
}) {
  const { theme } = useTheme();
  const baseTextStyle = [styles.chunkText, textStyle];

  if (mode === "live") {
    const text = liveInput ?? "";
    return (
      <View style={styles.liveBlank}>
        {text ? (
          <Text style={[baseTextStyle, { color: theme.appText }]}>{text}</Text>
        ) : (
          <Text style={[baseTextStyle, styles.livePlaceholder]}>xxx</Text>
        )}
        <View style={[styles.liveUnderline, { backgroundColor: theme.appText }]} />
      </View>
    );
  }

  if (mode === "correct") {
    if (ruby?.length) {
      return (
        <View style={styles.rubyAnswer}>
          <RubyParts parts={ruby} textStyle={[baseTextStyle, styles.correct]} />
        </View>
      );
    }
    return <Text style={[baseTextStyle, styles.correct]}>{expected}</Text>;
  }

  if (mode === "revealed") {
    if (ruby?.length) {
      return (
        <View style={styles.rubyAnswer}>
          <RubyParts parts={ruby} textStyle={[baseTextStyle, styles.correct]} />
        </View>
      );
    }
    return <Text style={[baseTextStyle, styles.revealedWrong]}>{expected}</Text>;
  }

  const exp = [...expected];
  const inp = [...input];
  let matchLen = 0;
  while (
    matchLen < inp.length &&
    matchLen < exp.length &&
    inp[matchLen] === exp[matchLen]
  ) {
    matchLen++;
  }

  return (
    <Text style={baseTextStyle}>
      {inp.slice(0, matchLen).map((c, i) => (
        <Text key={`ok-${i}`} style={styles.correct}>
          {c}
        </Text>
      ))}
      {inp.slice(matchLen).map((c, i) => (
        <Text key={`bad-${i}`} style={styles.partialWrong}>
          {c}
        </Text>
      ))}
      {exp.slice(Math.max(matchLen, inp.length)).map((c, i) => (
        <Text key={`miss-${i}`} style={styles.partialMissing}>
          {c}
        </Text>
      ))}
    </Text>
  );
}

export function displayExpectedForChunk(chunk: TargetChunk): string {
  if (chunk.script === "hiragana" || chunk.script === "katakana") {
    return chunk.reading || chunk.text;
  }
  return chunk.text;
}

const styles = StyleSheet.create({
  rubyWrap: {
    alignItems: "center",
    marginHorizontal: 1,
  },
  rubyReading: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "400",
  },
  rubyBase: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  chunkText: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 32,
  },
  liveBlank: {
    alignItems: "center",
    minWidth: 40,
    marginHorizontal: 2,
  },
  livePlaceholder: {
    opacity: 0,
  },
  liveUnderline: {
    height: 2,
    width: "100%",
    marginTop: 2,
  },
  correct: {
    fontWeight: "700",
    color: "#22c55e",
  },
  revealedWrong: {
    fontWeight: "700",
    color: "#dc2626",
  },
  partialWrong: {
    color: "#ef4444",
    textDecorationLine: "line-through",
    textDecorationColor: "#dc2626",
  },
  partialMissing: {
    color: "#dc2626",
    fontWeight: "700",
  },
  rubyAnswer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
});
