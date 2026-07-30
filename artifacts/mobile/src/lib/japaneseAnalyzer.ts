import { NativeModules, Platform } from "react-native";

export type AnalyzerToken = {
  surface_form: string;
  basic_form: string;
  reading?: string;
  pos?: string;
  start: number;
  end: number;
};

type NativeAnalyzerToken = {
  surface_form: string;
  basic_form: string;
  reading?: string;
  pos?: string;
};

type JapaneseTextAnalyzerModule = {
  tokenize: (text: string) => Promise<NativeAnalyzerToken[]>;
};

let analyzerAvailable: boolean | null = null;

function getNativeAnalyzer(): JapaneseTextAnalyzerModule | null {
  const mod = NativeModules.JapaneseTextAnalyzer as
    | JapaneseTextAnalyzerModule
    | undefined;
  if (!mod?.tokenize) return null;
  return mod;
}

export function isJapaneseAnalyzerAvailable(): boolean {
  if (Platform.OS === "web") return false;
  if (analyzerAvailable != null) return analyzerAvailable;
  analyzerAvailable = getNativeAnalyzer() != null;
  return analyzerAvailable;
}

/** Tokenize Japanese text using native Kuromoji (Android) / MeCab (iOS). Requires dev build. */
export async function tokenizeJapanese(text: string): Promise<AnalyzerToken[]> {
  if (!text.trim()) return [];

  const analyzer = getNativeAnalyzer();
  if (!analyzer) {
    throw new Error("Japanese analyzer native module not available (requires dev build)");
  }

  const raw = await analyzer.tokenize(text);

  let searchFrom = 0;
  return raw.map((t) => {
    const surface = t.surface_form ?? "";
    const start = text.indexOf(surface, searchFrom);
    const safeStart = start >= 0 ? start : searchFrom;
    const end = safeStart + surface.length;
    searchFrom = end;
    return {
      surface_form: surface,
      basic_form: t.basic_form === "*" ? surface : (t.basic_form ?? surface),
      reading: t.reading,
      pos: t.pos,
      start: safeStart,
      end,
    };
  });
}
