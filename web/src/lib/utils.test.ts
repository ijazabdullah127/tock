import { expect, test } from "vitest";
import { pressable } from "./utils";

test("Enter and Space on a pressable row act like a click", () => {
  let n = 0;
  const p = pressable(() => n++);
  const row = {};
  const ev = (key: string, target: unknown = row) => ({ key, target, currentTarget: row, preventDefault() {} });
  expect(p.tabIndex).toBe(0);
  p.onKeyDown(ev("Enter"));
  p.onKeyDown(ev(" "));
  p.onKeyDown(ev("a"));
  expect(n).toBe(2);
  // A key on a button inside the row is that button's.
  p.onKeyDown(ev("Enter", {}));
  expect(n).toBe(2);
});
