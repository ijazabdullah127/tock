// How the dashboard's numbers are made, for the explanations behind them.
import type { Score } from "./api";
import { dur } from "./format";

/** STATS mirrors the constants of internal/stats/stats.go and the usual day
 *  of internal/app/usual.go; TestExplainMirrorsStats checks they agree. */
export const STATS = {
  blockMinMin: 5, // a focus block holds at least this much deep time
  longBlockMin: 25, // blocks this long count for the blocks part
  toleranceS: 60, // a shorter break does not end a block
  switchMinS: 30, // a stretch of one kind this long can be a switch
  resetGapMin: 5, // a gap this long starts switch counting afresh
  workdayMinMin: 60, // active time that makes a day a workday
  calmZeroPerHour: 20, // switches an hour that make the calm part 0
  penaltyPerMin: 4, // distraction minutes per penalty point
  penaltyCap: 15,
  browseWeight: 3, // browse minutes that weigh like one distraction minute
  stretchFullMin: 90, // a run this long makes the stretch part full
  usualWeeks: 4, // past weeks the usual day is taken from
} as const;

export const DEFAULT_WEIGHTS = { depth: 0.5, blocks: 0.3, calm: 0.2, stretch: 0 };

export type Part = { key: "depth" | "blocks" | "calm" | "stretch"; name: string; detail: string; weight: number; value: number; points: number };

/** scoreParts is the score taken apart: each weighted part (a weight of 0
 *  leaves it out) with its points, their sum, the sum rounded, and the
 *  penalty that rounded sum loses to make the value. */
export function scoreParts(s: Score): { parts: Part[]; sum: number; rounded: number; penalty: number; value: number } {
  const w = s.weights ?? DEFAULT_WEIGHTS;
  const all: Omit<Part, "points">[] = [
    { key: "depth", name: "Focus time", detail: `against your ${dur(s.targetMS)} target`, weight: w.depth, value: s.depth },
    { key: "blocks", name: "Long blocks", detail: `share of focus in blocks of ${STATS.longBlockMin}m or more`, weight: w.blocks, value: s.blocks },
    { key: "calm", name: "Calm", detail: `${s.switchesPerHour.toFixed(1)} switches an hour; ${STATS.calmZeroPerHour} makes it 0`, weight: w.calm, value: s.calm },
    { key: "stretch", name: "Longest run", detail: `without a switch; ${STATS.stretchFullMin}m makes it full`, weight: w.stretch, value: s.stretch },
  ];
  const parts = all.filter((p) => p.weight > 0).map((p) => ({ ...p, points: Math.round(1000 * p.weight * p.value) / 10 }));
  const sum = all.reduce((t, p) => t + 100 * p.weight * p.value, 0);
  return { parts, sum, rounded: Math.round(sum), penalty: s.penalty, value: s.value };
}
