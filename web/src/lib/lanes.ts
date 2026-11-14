// The timeline's lane names: how wide their column is.

/** LABEL_MIN_REM is the narrowest the name column gets. */
export const LABEL_MIN_REM = 9;

// A character of 13px Inter is about 7.5px; the duration, its gap and the
// space before the track take about 4.75rem.
const CHAR_REM = 0.48;
const REST_REM = 4.75;

/** labelWidth is the CSS width of the name column: room for the longest
 *  name and its duration, at least LABEL_MIN_REM, and never more than 30 %
 *  of the timeline, so a narrow window keeps its track (names that do not
 *  fit then truncate, with the full name in their title). */
export function labelWidth(names: string[]): string {
  const n = names.reduce((m, s) => Math.max(m, [...s].length), 0);
  const want = n ? Math.max(LABEL_MIN_REM, Math.round((n * CHAR_REM + REST_REM) * 100) / 100) : LABEL_MIN_REM;
  return `clamp(${LABEL_MIN_REM}rem, ${want}rem, max(${LABEL_MIN_REM}rem, 30%))`;
}
