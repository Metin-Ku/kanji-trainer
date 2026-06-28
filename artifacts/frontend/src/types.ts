export interface Word {
  id: number;
  kanji: string;
  pronunciation: string;
  meaning: string;
  description: string;
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
  level?: number;
  jlptLevel?: string | null;
  date: string;
}

export interface WordUpdate {
  kanji?: string;
  pronunciation?: string;
  meaning?: string;
  description?: string;
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
