import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { RubyPart, SrsExample, TargetChunk } from "@/lib/types";
import {
  expectedForPartialFeedback,
  getExpectedAnswer,
} from "@/lib/srsExamples";
import {
  displayExpectedForChunk,
  HiddenAnswerDisplay,
  RubyParts,
} from "@/components/RubyText";
import { useTheme } from "@/theme/ThemeProvider";

interface Props {
  example: SrsExample;
  headwordKanji?: string;
  liveAnswer?: string;
  answerState?: "typing" | "correct" | "partial" | "revealed";
}

function TextChunk({ text, ruby }: { text: string; ruby?: RubyPart[] }) {
  const { theme } = useTheme();
  const textStyle = { color: theme.appText };

  if (ruby?.length) {
    return (
      <RubyParts
        parts={ruby}
        textStyle={[styles.chunkText, textStyle]}
        readingStyle={{ color: theme.appTextSecondary }}
      />
    );
  }
  return <Text style={[styles.chunkText, textStyle]}>{text}</Text>;
}

function HiddenSlot({
  chunk,
  expected,
  partialExpected,
  liveAnswer,
  answerState,
}: {
  chunk: TargetChunk;
  expected: string;
  partialExpected: string;
  liveAnswer: string;
  answerState: "typing" | "correct" | "partial" | "revealed";
}) {
  return (
    <HiddenAnswerDisplay
      expected={answerState === "partial" ? partialExpected : expected}
      input={liveAnswer}
      liveInput={liveAnswer}
      ruby={chunk.ruby}
      mode={
        answerState === "correct"
          ? "correct"
          : answerState === "revealed"
            ? "revealed"
            : answerState === "partial"
              ? "partial"
              : "live"
      }
      textStyle={styles.chunkText}
    />
  );
}

export function ExampleSentenceDisplay({
  example,
  headwordKanji,
  liveAnswer = "",
  answerState = "typing",
}: Props) {
  const { theme } = useTheme();
  const chunks = example.targetChunks;
  const primaryHidden = chunks?.find((c) => c.type === "hidden");
  const expected = primaryHidden
    ? displayExpectedForChunk(primaryHidden)
    : getExpectedAnswer(example, headwordKanji);
  const partialExpected = expectedForPartialFeedback(
    example,
    liveAnswer,
    headwordKanji,
  );

  const textStyle = useMemo(
    () => [styles.sentence, { color: theme.appText }],
    [theme.appText],
  );

  if (chunks?.length) {
    return (
      <View style={styles.rowWrap}>
        {chunks.map((chunk, i) => {
          if (chunk.type === "hidden") {
            const isPrimary = chunk === primaryHidden;
            if (!isPrimary) {
              return (
                <View key={i} style={styles.inlineChunk}>
                  <TextChunk text={chunk.text} ruby={chunk.ruby} />
                </View>
              );
            }
            return (
              <View key={i} style={styles.inlineChunk}>
                <HiddenSlot
                  chunk={chunk}
                  expected={expected}
                  partialExpected={partialExpected}
                  liveAnswer={liveAnswer}
                  answerState={answerState}
                />
              </View>
            );
          }
          if (!chunk.text.trim() && !chunk.ruby?.length) return null;
          return (
            <View key={i} style={styles.inlineChunk}>
              <TextChunk text={chunk.text} ruby={chunk.ruby} />
            </View>
          );
        })}
      </View>
    );
  }

  const hiddenWord = example.hiddenWord;
  const sentence = example.sentence;
  const before = hiddenWord ? (sentence.split(hiddenWord)[0] ?? "") : sentence;
  const after = hiddenWord ? (sentence.split(hiddenWord)[1] ?? "") : "";

  return (
    <View style={styles.rowWrap}>
      <Text style={textStyle}>{before}</Text>
      {hiddenWord ? (
        <View style={styles.inlineChunk}>
          <HiddenAnswerDisplay
            expected={
              answerState === "partial"
                ? expectedForPartialFeedback(example, liveAnswer, headwordKanji)
                : expected
            }
            input={liveAnswer}
            liveInput={liveAnswer}
            mode={
              answerState === "correct"
                ? "correct"
                : answerState === "partial"
                  ? "partial"
                  : answerState === "revealed"
                    ? "revealed"
                    : "live"
            }
            textStyle={styles.chunkText}
          />
        </View>
      ) : null}
      <Text style={textStyle}>{after}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 0,
  },
  inlineChunk: {
    alignItems: "flex-end",
  },
  sentence: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 32,
  },
  chunkText: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 32,
  },
});
