import * as wanakana from "wanakana";
import type { HiddenScript } from "../types";

/** Replace contiguous Latin runs with kana (fixes mixed し+ppai cases). */
export function romajiToKanaInput(
  raw: string,
  script: HiddenScript = "kanji",
): string {
  if (!raw) return raw;

  const kanaScript: "hiragana" | "katakana" =
    script === "katakana" ? "katakana" : "hiragana";

  return raw.replace(/[a-zA-Z]+/g, (latin) => {
    if (kanaScript === "katakana") {
      return wanakana.toKatakana(latin, { IMEMode: true });
    }
    return wanakana.toHiragana(latin, { IMEMode: true });
  });
}

export function kanaVariants(
  text: string,
  script?: HiddenScript,
): string[] {
  const n = text.trim().normalize("NFC");
  if (!n) return [];
  const out = new Set<string>([n]);

  if (/[a-zA-Z]/.test(n)) {
    if (script === "katakana") {
      out.add(romajiToKanaInput(n, "katakana").normalize("NFC"));
    } else if (script === "hiragana") {
      out.add(romajiToKanaInput(n, "hiragana").normalize("NFC"));
    } else {
      out.add(romajiToKanaInput(n, "hiragana").normalize("NFC"));
      out.add(romajiToKanaInput(n, "katakana").normalize("NFC"));
    }
  }
  return [...out];
}

export function effectiveHiddenScript(
  script?: HiddenScript,
  classes?: { hiragana?: boolean; katakana?: boolean },
): HiddenScript {
  if (classes?.katakana) return "katakana";
  if (classes?.hiragana) return "hiragana";
  return script ?? "kanji";
}
