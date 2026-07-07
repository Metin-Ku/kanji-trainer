import { useEffect, useState } from "react";
import type { TargetChunk } from "../types";

/** Render inline ruby with furigana above kanji. */
export function RubyInline({
  base,
  reading,
  className = "",
}: {
  base: string;
  reading?: string;
  className?: string;
}) {
  if (!reading) return <span className={className}>{base}</span>;
  return (
    <ruby className={`align-baseline ${className}`}>
      {base}
      <rt className="text-[0.45em] font-normal text-app-text-secondary leading-none">
        {reading}
      </rt>
    </ruby>
  );
}

export function RubyParts({
  parts,
  className = "",
}: {
  parts: { base: string; reading?: string }[];
  className?: string;
}) {
  return (
    <>
      {parts.map((p, i) => (
        <RubyInline key={i} base={p.base} reading={p.reading} className={className} />
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
}: {
  expected: string;
  input: string;
  mode: "live" | "correct" | "partial" | "revealed";
  liveInput?: string;
  ruby?: TargetChunk["ruby"];
}) {
  if (mode === "live") {
    const text = liveInput ?? "";
    if (!text) {
      return <span className="text-black">＿＿</span>;
    }
    return <span className="text-black">{text}</span>;
  }

  if (mode === "correct") {
    if (ruby?.length) {
      return (
        <span className="text-green-500 font-bold">
          <RubyParts parts={ruby} />
        </span>
      );
    }
    return <span className="text-green-500 font-bold">{expected}</span>;
  }

  if (mode === "revealed") {
    if (ruby?.length) {
      return (
        <span className="text-green-500 font-bold">
          <RubyParts parts={ruby} />
        </span>
      );
    }
    return <span className="text-red-600 font-bold">{expected}</span>;
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
    <span className="inline">
      {inp.slice(0, matchLen).map((c, i) => (
        <span key={`ok-${i}`} className="text-green-500 font-bold">
          {c}
        </span>
      ))}
      {inp.slice(matchLen).map((c, i) => (
        <span
          key={`bad-${i}`}
          className="text-red-500 line-through decoration-red-600"
        >
          {c}
        </span>
      ))}
      {exp.slice(Math.max(matchLen, inp.length)).map((c, i) => (
        <span key={`miss-${i}`} className="text-red-600">
          {c}
        </span>
      ))}
    </span>
  );
}

export function displayExpectedForChunk(chunk: TargetChunk): string {
  if (chunk.script === "hiragana" || chunk.script === "katakana") {
    return chunk.reading || chunk.text;
  }
  return chunk.text;
}
