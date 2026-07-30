/** Normalize category SVG so SvgXml `color` prop tints fill/stroke (matches web currentColor). */
export function prepareCategoryIconSvg(svg: string): string {
  let s = svg.trim();
  s = s.replace(/fill:\s*(?!none|currentColor)[^;"']+/gi, "fill:currentColor");
  s = s.replace(/stroke:\s*(?!none|currentColor)[^;"']+/gi, "stroke:currentColor");
  s = s.replace(/\bfill="(?!none|currentColor)[^"]*"/gi, 'fill="currentColor"');
  s = s.replace(/\bstroke="(?!none|currentColor)[^"]*"/gi, 'stroke="currentColor"');
  return s;
}
