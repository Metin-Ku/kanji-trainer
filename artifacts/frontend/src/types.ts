export type HiddenScript = "kanji" | "hiragana" | "katakana";

export interface RubyPart {
  base: string;
  reading?: string;
}

export interface TargetChunk {
  type: "text" | "hidden";
  text: string;
  reading?: string;
  ruby?: RubyPart[];
  script?: HiddenScript;
}

export interface SrsExampleHint {
  text: string;
  highlights?: string[];
}

export interface LinkedToken {
  start: number;
  end: number;
  surface: string;
  wordId: number;
  lemma?: string;
}

export interface SrsExample {
  order: number;
  sentence: string;
  hiddenWord: string;
  hiddenReading?: string;
  hiddenScript?: HiddenScript;
  targetChunks?: TargetChunk[];
  linkedTokens?: LinkedToken[];
  hints: SrsExampleHint[];
}

export interface Word {
  id: number;
  kanji: string;
  pronunciation: string;
  meaning: string;
  description: string;
  srsExamples: SrsExample[];
  level: number;
  starred: boolean;
  pronLevel: number;
  pronStarred: boolean;
  meaningLevel: number;
  meaningStarred: boolean;
  jlptLevel?: string | null;
  date: string;
  createdAt: string;
  relatedWordIds: number[];
}

export interface WordInput {
  kanji: string;
  pronunciation?: string;
  meaning?: string;
  description?: string;
  srsExamples?: SrsExample[];
  level?: number;
  jlptLevel?: string | null;
  date: string;
  relatedWordIds?: number[];
}

export interface WordUpdate {
  kanji?: string;
  pronunciation?: string;
  meaning?: string;
  description?: string;
  srsExamples?: SrsExample[];
  level?: number;
  starred?: boolean;
  pronLevel?: number;
  pronStarred?: boolean;
  meaningLevel?: number;
  meaningStarred?: boolean;
  jlptLevel?: string | null;
  date?: string;
  relatedWordIds?: number[];
}
