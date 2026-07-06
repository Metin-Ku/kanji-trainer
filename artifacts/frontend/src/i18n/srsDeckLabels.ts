import type { SrsDeckType } from "../types/srs";

export function srsDeckLabel(
  t: (key: string) => string,
  deck: SrsDeckType,
): { title: string; subtitle: string } {
  return {
    title: t(`srs.decks.${deck}.title`),
    subtitle: t(`srs.decks.${deck}.subtitle`),
  };
}
