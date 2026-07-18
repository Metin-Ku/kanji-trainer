import type { Word } from "../types";
import { SrsWordSlideUp } from "./SrsWordSlideUp";
import type { WordUpdate } from "../types";

interface Props {
  word: Word;
  allWords?: Word[];
  onClose: () => void;
  onSave?: (
    data: WordUpdate & { relatedWordIds: number[]; categoryIds: number[] },
  ) => void;
  bottom?: number;
}

export function WordDetailSheet({
  word,
  allWords = [],
  onClose,
  onSave,
  bottom = 0,
}: Props) {
  return (
    <SrsWordSlideUp
      open
      word={word}
      allWords={allWords}
      onClose={onClose}
      onSave={onSave}
      bottom={bottom}
    />
  );
}
