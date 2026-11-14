import { expect, test } from "vitest";
import { scoreParts } from "./explain";
import type { Score } from "./api";

const score: Score = {
  value: 95, depth: 1, blocks: 0.9, calm: 0.93, stretch: 0.6, penalty: 1,
  switchesPerHour: 1.4, targetMS: 4 * 3_600_000,
  weights: { depth: 0.5, blocks: 0.3, calm: 0.2, stretch: 0 },
};

test("the parts add up to the score, less the penalty", () => {
  const s = scoreParts(score);
  // Stretch weighs nothing by default, so it is not a part.
  expect(s.parts.map((p) => p.key)).toEqual(["depth", "blocks", "calm"]);
  expect(s.parts.map((p) => p.points)).toEqual([50, 27, 18.6]);
  expect(s.sum).toBeCloseTo(95.6);
  expect(s.rounded).toBe(96);
  expect(s.rounded - s.penalty).toBe(s.value);
});

test("a stretch weight from config shows the stretch part", () => {
  const s = scoreParts({ ...score, weights: { depth: 0.4, blocks: 0.3, calm: 0.2, stretch: 0.1 } });
  expect(s.parts.map((p) => p.key)).toEqual(["depth", "blocks", "calm", "stretch"]);
  expect(s.parts[3].points).toBe(6);
});

test("without weights from the server, the defaults are used", () => {
  const { weights: _, ...old } = score;
  expect(scoreParts(old as Score).parts.map((p) => p.weight)).toEqual([0.5, 0.3, 0.2]);
});
