// Kinds of time and their colours: the same five on every tock surface.
export const KINDS = ["deep", "shallow", "browse", "neutral", "distract"] as const;
export type Kind = (typeof KINDS)[number];

const LABELS: Record<Kind, string> = {
  deep: "Deep",
  shallow: "Shallow",
  browse: "Browsing",
  neutral: "Neutral",
  distract: "Distracting",
};

// What each kind counts as, as internal/stats and internal/focus treat it
// (and docs/guide.md's table of kinds says).
const HELP: Record<Kind | "", string> = {
  deep: "Focused work: only Deep time makes focus blocks and the focus score.",
  shallow: "Work that is not focus, such as email, planning or looking things up.",
  browse: "Search, feeds and shopping: a third of it weighs on the score like a distraction, but it is never nudged or blocked.",
  neutral: "Neither work nor distraction, such as utilities or reading for pleasure.",
  distract: "Entertainment: every 4 minutes cost the score a point, and focus sessions nudge or block it.",
  "": "Time no rule or label has sorted yet. Label it in the Inbox.",
};

/** kindHelp is a kind's one-line definition; an unknown kind is neutral. */
export function kindHelp(k: string): string {
  return HELP[k === "" ? "" : isKind(k) ? k : "neutral"];
}

export function isKind(k: string): k is Kind {
  return (KINDS as readonly string[]).includes(k);
}

/** kindColor is the CSS colour of a kind; an unknown kind is neutral. */
export function kindColor(k: string): string {
  if (k === "") return "hsl(var(--faint) / 0.55)"; // unlabelled
  return `hsl(var(--k-${isKind(k) ? k : "neutral"}))`;
}

export function kindLabel(k: string): string {
  return isKind(k) ? LABELS[k] : "Unlabelled";
}

/** SERIES are the stacked series of the charts: the kinds, then unlabelled (""). */
export const SERIES = [...KINDS, ""] as const;

/** byKind turns {deep: ms, …} into rows in KINDS order, unlabelled ("")
 *  last, zeros dropped. */
export function byKindRows(m: Record<string, number> | undefined): { kind: string; ms: number }[] {
  if (!m) return [];
  return SERIES.filter((k) => (m[k] ?? 0) > 0).map((k) => ({ kind: k, ms: m[k] }));
}
