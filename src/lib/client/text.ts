const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("ja", { granularity: "grapheme" }) : null

/** Same counting rule as the server (grapheme clusters). */
export function graphemeCount(value: string): number {
  if (!segmenter) return Array.from(value).length
  return Array.from(segmenter.segment(value)).length
}
