import { test, expect } from "vitest";
import { dur, clock, delta, pct, dayTitle, isoDate, parseDate, addDays, entries, doneText } from "./format";

test("dur", () => {
  expect(dur(8_640_000)).toBe("2h24");
  expect(dur(2_700_000)).toBe("45m");
  expect(dur(0)).toBe("0m");
  expect(dur(3_600_000)).toBe("1h00");
});
test("clock", () => {
  expect(clock(8_640_000)).toBe("2:24");
  expect(clock(300_000)).toBe("0:05");
});
test("delta", () => {
  expect(delta(2_880_000)).toBe("+48m");
  expect(delta(-1_380_000)).toBe("−23m");
});
test("pct", () => {
  expect(pct(1, 4)).toBe("25 %");
  expect(pct(1, 0)).toBe("0 %");
});
test("dates", () => {
  const d = parseDate("2026-11-05");
  expect(isoDate(d)).toBe("2026-11-05");
  expect(dayTitle(d)).toBe("Thu 5 Nov");
  expect(isoDate(addDays(d, -5))).toBe("2026-10-31");
});

test("entries counts in the singular for one", () => {
  expect(entries(1)).toBe("1 entry");
  expect(entries(0)).toBe("0 entries");
  expect(entries(14)).toBe("14 entries");
});

test("doneText names the range a timeline label covers, else the count", () => {
  const d = { label: "Research", spans: 1, ms: 960_000 };
  expect(doneText(d)).toBe("Research · 1 entry, 16m");
  expect(doneText({ ...d, ms: 0 }, "14:41–14:53 (12m)")).toBe("Labelled 14:41–14:53 (12m) · Research");
});

import { holdsToday, hhmm, hourLabel, is12h, minClock, mondayOf, periodTitle, setClock, setWeekStart, stepDate, weekHeads, weekStartOf } from "./format";

test("the date control steps by the view's unit and stops at today", () => {
  const today = new Date(2026, 10, 11); // Wed 11 Nov
  expect(stepDate("2026-11-10", "day", 1, today)).toBe("2026-11-11");
  expect(stepDate("2026-11-11", "day", 1, today)).toBe("2026-11-11");
  expect(stepDate("2026-11-04", "week", 1, today)).toBe("2026-11-11");
  expect(stepDate("2026-11-11", "week", -1, today)).toBe("2026-11-04");
  expect(stepDate("2026-11-11", "month", -1, today)).toBe("2026-10-01");
  expect(stepDate("2026-10-01", "month", 1, today)).toBe("2026-11-01");
  expect(holdsToday("2026-11-09", "week", today)).toBe(true);
  expect(holdsToday("2026-11-08", "week", today)).toBe(false);
  expect(isoDate(mondayOf(new Date(2026, 10, 15)))).toBe("2026-11-09");
});

test("the date control names the period", () => {
  const today = new Date(2026, 10, 11);
  expect(periodTitle("2026-11-11", "day", today)).toBe("Today");
  expect(periodTitle("2026-10-10", "day", today)).toBe("Sat 10 Oct");
  expect(periodTitle("2026-11-11", "week", today)).toBe("This week");
  expect(periodTitle("2026-10-10", "week", today)).toBe("5–11 Oct");
  expect(periodTitle("2026-10-01", "week", today)).toBe("28 Sep – 4 Oct");
  expect(periodTitle("2026-10-10", "month", today)).toBe("Oct 2026");
});

test("weeks start on the week_start day", () => {
  const sat = new Date(2026, 9, 10, 15); // Sat 10 Oct 2026
  const heads = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  try {
    expect(isoDate(weekStartOf(sat))).toBe("2026-10-05");
    expect(weekHeads(heads)[0]).toBe("Mo");
    setWeekStart("sunday");
    expect(isoDate(weekStartOf(sat))).toBe("2026-10-04");
    expect(isoDate(weekStartOf(new Date(2026, 9, 11)))).toBe("2026-10-11");
    expect(weekHeads(heads).join(" ")).toBe("Su Mo Tu We Th Fr Sa");
    expect(holdsToday("2026-11-08", "week", new Date(2026, 10, 11))).toBe(true);
    expect(periodTitle("2026-10-10", "week", new Date(2026, 10, 11))).toBe("4–10 Oct");
    // Weeks holding a DST change in most zones.
    expect(isoDate(weekStartOf(new Date(2026, 2, 31)))).toBe("2026-03-29");
    expect(isoDate(weekStartOf(new Date(2026, 10, 3)))).toBe("2026-11-01");
    setWeekStart("saturday");
    expect(isoDate(weekStartOf(sat))).toBe("2026-10-10");
    expect(isoDate(weekStartOf(new Date(2026, 9, 9, 23)))).toBe("2026-10-03");
    expect(weekHeads(heads).join(" ")).toBe("Sa Su Mo Tu We Th Fr");
    setWeekStart("tuesday");
    expect(isoDate(weekStartOf(sat))).toBe("2026-10-05");
  } finally {
    setWeekStart();
  }
});

test("the 12-hour clock follows [display] clock", () => {
  const at = (h: number, m: number) => new Date(2026, 10, 15, h, m).getTime();
  expect(hhmm(at(0, 0))).toBe("00:00");
  expect(hhmm(at(17, 20))).toBe("17:20");
  expect(hourLabel(9)).toBe("09");
  try {
    setClock("12h");
    expect(is12h()).toBe(true);
    expect(hhmm(at(0, 0))).toBe("12:00am");
    expect(hhmm(at(0, 5))).toBe("12:05am");
    expect(hhmm(at(9, 5))).toBe("9:05am");
    expect(hhmm(at(12, 0))).toBe("12:00pm");
    expect(hhmm(at(17, 20))).toBe("5:20pm");
    expect(minClock(23 * 60 + 59)).toBe("11:59pm");
    expect(hourLabel(0)).toBe("12am");
    expect(hourLabel(9)).toBe("9am");
    expect(hourLabel(12)).toBe("12pm");
    expect(hourLabel(18)).toBe("6pm");
    setClock("24h");
    expect(hhmm(at(17, 20))).toBe("17:20");
  } finally {
    setClock();
  }
  expect(is12h()).toBe(false);
});
