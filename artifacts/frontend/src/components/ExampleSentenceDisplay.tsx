import type { Word, TargetChunk, SrsExample } from "../types";
import {
  getExpectedAnswer,
  expectedForPartialFeedback,
} from "../lib/srsExamples";
import {
  buildWordsById,
  segmentTextWithLinks,
  linkedTokensForDisplay,
  findLinkedTokenForChunk,
  rubyPartsForLinkedSpan,
  sliceRubyPartsForRange,
} from "../lib/wordLinking";
import {
  RubyParts,
  HiddenAnswerDisplay,
  displayExpectedForChunk,
} from "./RubyText";

interface Props {
  example: SrsExample;
  headwordKanji?: string;
  words: Word[];
  wordLinksEnabled: boolean;
  liveAnswer?: string;
  answerState?: "typing" | "correct" | "partial" | "revealed";
  onWordTap?: (word: Word) => void;
  className?: string;
}

function LinkedTextSpan({
  text,
  chunkOffset,
  linkedTokens,
  wordsById,
  wordLinksEnabled,
  onWordTap,
  ruby,
}: {
  text: string;
  chunkOffset: number;
  linkedTokens?: SrsExample["linkedTokens"];
  wordsById: Map<number, Word>;
  wordLinksEnabled: boolean;
  onWordTap?: (word: Word) => void;
  ruby?: TargetChunk["ruby"];
}) {
  if (!wordLinksEnabled || !linkedTokens?.length) {
    if (ruby?.length) return <RubyParts parts={ruby} />;
    return <span>{text}</span>;
  }

  const segs = segmentTextWithLinks(text, chunkOffset, linkedTokens);
  let local = 0;
  return (
    <>
      {segs.map((seg, i) => {
        if (seg.kind === "link") {
          const word = wordsById.get(seg.wordId);
          const relStart = local;
          local += seg.text.length;
          if (!word) return <span key={i}>{seg.text}</span>;
          const sub = ruby?.length
            ? sliceRubyPartsForRange(ruby, relStart, local)
            : null;
          const parts =
            sub && sub.length > 0
              ? sub
              : rubyPartsForLinkedSpan(seg.text, word);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onWordTap?.(word)}
              className="decoration-app-text-muted hover:decoration-main-500 text-app-text underline decoration-dotted underline-offset-4"
            >
              <RubyParts parts={parts} />
            </button>
          );
        }
        const relStart = local;
        local += seg.text.length;
        const sub = ruby?.length
          ? sliceRubyPartsForRange(ruby, relStart, local)
          : null;
        if (sub?.some((p) => p.reading)) {
          return <RubyParts key={i} parts={sub} />;
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </>
  );
}

function TextWithLinks({
  text,
  ruby,
  chunkOffset,
  linkedTokens,
  wordsById,
  wordLinksEnabled,
  onWordTap,
}: {
  text: string;
  ruby?: TargetChunk["ruby"];
  chunkOffset: number;
  linkedTokens?: SrsExample["linkedTokens"];
  wordsById: Map<number, Word>;
  wordLinksEnabled: boolean;
  onWordTap?: (word: Word) => void;
}) {
  return (
    <LinkedTextSpan
      text={text}
      chunkOffset={chunkOffset}
      linkedTokens={linkedTokens}
      wordsById={wordsById}
      wordLinksEnabled={wordLinksEnabled}
      onWordTap={onWordTap}
      ruby={ruby}
    />
  );
}

function SecondaryHiddenChunk({
  chunk,
  chunkOffset,
  linkedTokens,
  wordsById,
  wordLinksEnabled,
  onWordTap,
}: {
  chunk: TargetChunk;
  chunkOffset: number;
  linkedTokens?: SrsExample["linkedTokens"];
  wordsById: Map<number, Word>;
  wordLinksEnabled: boolean;
  onWordTap?: (word: Word) => void;
}) {
  const token = findLinkedTokenForChunk(chunkOffset, chunk.text, linkedTokens);

  if (wordLinksEnabled && token) {
    const word = wordsById.get(token.wordId);
    if (word) {
      const parts = chunk.ruby?.length
        ? chunk.ruby
        : rubyPartsForLinkedSpan(chunk.text, word);
      return (
        <span className="mx-0.5 inline-block">
          <button
            type="button"
            onClick={() => onWordTap?.(word)}
            className="decoration-app-text-muted hover:decoration-main-500 text-app-text underline decoration-dotted underline-offset-4"
          >
            <RubyParts parts={parts} />
          </button>
        </span>
      );
    }
  }

  if (chunk.ruby?.length) {
    return (
      <span className="mx-0.5 inline-block">
        <RubyParts parts={chunk.ruby} />
      </span>
    );
  }

  return <span className="mx-0.5 inline-block">{chunk.text}</span>;
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
    />
  );
}

export function ExampleSentenceDisplay({
  example,
  headwordKanji,
  words,
  wordLinksEnabled,
  liveAnswer = "",
  answerState = "typing",
  onWordTap,
  className = "",
}: Props) {
  const wordsById = buildWordsById(words);
  const chunks = example.targetChunks;
  const linkedTokens = linkedTokensForDisplay(example);
  const primaryHidden = chunks?.find((c) => c.type === "hidden");
  const expected = primaryHidden
    ? displayExpectedForChunk(primaryHidden)
    : getExpectedAnswer(example, headwordKanji);
  const partialExpected = expectedForPartialFeedback(
    example,
    liveAnswer,
    headwordKanji,
  );

  if (chunks?.length) {
    let offset = 0;
    return (
      <p
        className={`text-app-text text-2xl leading-loose font-bold ${className}`}
      >
        {chunks.map((chunk, i) => {
          const chunkOffset = offset;
          offset += chunk.text.length;

          if (chunk.type === "hidden") {
            const isPrimary = chunk === primaryHidden;
            if (!isPrimary) {
              return (
                <SecondaryHiddenChunk
                  key={i}
                  chunk={chunk}
                  chunkOffset={chunkOffset}
                  linkedTokens={linkedTokens}
                  wordsById={wordsById}
                  wordLinksEnabled={wordLinksEnabled}
                  onWordTap={onWordTap}
                />
              );
            }
            return (
              <span key={i} className="mx-0.5 inline-block align-baseline">
                <HiddenSlot
                  chunk={chunk}
                  expected={expected}
                  partialExpected={partialExpected}
                  liveAnswer={liveAnswer}
                  answerState={answerState}
                />
              </span>
            );
          }
          if (
            chunk.type === "text" &&
            !chunk.text.trim() &&
            !chunk.ruby?.length
          ) {
            return null;
          }
          return (
            <span key={i}>
              <TextWithLinks
                text={chunk.text}
                ruby={chunk.ruby}
                chunkOffset={chunkOffset}
                linkedTokens={linkedTokens}
                wordsById={wordsById}
                wordLinksEnabled={wordLinksEnabled}
                onWordTap={onWordTap}
              />
            </span>
          );
        })}
      </p>
    );
  }

  const hiddenWord = example.hiddenWord;
  const sentence = example.sentence;

  const before = hiddenWord ? (sentence.split(hiddenWord)[0] ?? "") : sentence;
  const after = hiddenWord ? (sentence.split(hiddenWord)[1] ?? "") : "";
  const beforeLen = before.length;
  const afterOffset = beforeLen + (hiddenWord?.length ?? 0);

  return (
    <p
      className={`text-app-text text-2xl leading-relaxed font-bold ${className}`}
    >
      <LinkedTextSpan
        text={before}
        chunkOffset={0}
        linkedTokens={linkedTokens}
        wordsById={wordsById}
        wordLinksEnabled={wordLinksEnabled}
        onWordTap={onWordTap}
      />
      {hiddenWord ? (
        <span className="mx-0.5 inline-block align-baseline">
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
          />
        </span>
      ) : null}
      <LinkedTextSpan
        text={after}
        chunkOffset={afterOffset}
        linkedTokens={linkedTokens}
        wordsById={wordsById}
        wordLinksEnabled={wordLinksEnabled}
        onWordTap={onWordTap}
      />
    </p>
  );
}
