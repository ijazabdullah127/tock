import { test, expect } from "vitest";
import { kindColor, kindLabel, byKindRows, kindHelp, KINDS } from "./kinds";

test("every kind, and unlabelled time, has a one-line definition", () => {
  for (const k of [...KINDS, ""]) expect(kindHelp(k)).toMatch(/^[A-Z].+\.$/);
  expect(kindHelp("deep")).toContain("focus");
  expect(kindHelp("distract")).toContain("score");
  expect(kindHelp("weird")).toBe(kindHelp("neutral"));
});

test("unknown kinds fall back to neutral", () => {
  expect(kindColor("weird")).toBe(kindColor("neutral"));
  expect(kindLabel("weird")).toBe("Unlabelled");
});
test("byKindRows keeps order and drops zeros", () => {
  expect(byKindRows({ distract: 5, deep: 10, shallow: 0 })).toEqual([
    { kind: "deep", ms: 10 },
    { kind: "distract", ms: 5 },
  ]);
});

test("unlabelled time comes last with its own colour", () => {
  expect(byKindRows({ "": 3, deep: 1 })).toEqual([{ kind: "deep", ms: 1 }, { kind: "", ms: 3 }]);
  expect(kindColor("")).not.toBe(kindColor("neutral"));
  expect(kindLabel("")).toBe("Unlabelled");
});
