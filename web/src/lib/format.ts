// Durations and numbers as the dashboard writes them: 2h24 in cards, 2:24 in
// tables, a true minus sign for decreases.

const MIN = 60_000;

/** dur(8_640_000) = "2h24", dur(2_700_000) = "45m". */
export function dur(ms: number): string {
  const m = Math.round(Math.abs(ms) / MIN);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}

/** clock(8_640_000) = "2:24". */
export function clock(ms: number): string {
  const m = Math.round(Math.abs(ms) / MIN);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/** delta(2_880_000) = "+48m", delta(-1_380_000) = "−23m". */
export function delta(ms: number): string {
  const sign = ms < 0 ? "−" : "+";
  return sign + dur(ms);
}

/** pct(1, 4) = "25 %"; a zero whole is "0 %". */
export function pct(part: number, whole: number): string {
  if (whole <= 0) return "0 %";
  return `${Math.round((part / whole) * 100)} %`;
}

/** twelve is config.toml's [display] clock = "12h"; 24-hour otherwise. */
let twelve = false;

/** setClock takes clock as /api/status sends it: "12h" turns on the
 *  12-hour clock, anything else is 24-hour. */
export function setClock(name?: string) {
  twelve = name === "12h";
}

/** is12h says whether times of day are shown on the 12-hour clock. */
export function is12h(): boolean {
  return twelve;
}

/** minClock(545) is minute 545 of the day: "09:05", or "9:05am" on the
 *  12-hour clock ("12:00am" midnight, "12:00pm" noon). */
export function minClock(min: number): string {
  const h = Math.floor(min / 60) % 24, m = String(min % 60).padStart(2, "0");
  if (!twelve) return `${String(h).padStart(2, "0")}:${m}`;
  return `${h % 12 || 12}:${m}${h < 12 ? "am" : "pm"}`;
}

/** hourLabel(9) is an hour-only tick: "09", or "9am" on the 12-hour clock. */
export function hourLabel(h: number): string {
  if (!twelve) return String(h).padStart(2, "0");
  return `${h % 12 || 12}${h % 24 < 12 ? "am" : "pm"}`;
}

/** hhmm(ms) is the local wall-clock time, "09:05" or "9:05am". */
export function hhmm(ms: number): string {
  const d = new Date(ms);
  return minClock(d.getHours() * 60 + d.getMinutes());
}

/** isoDate(d) is the local date as YYYY-MM-DD. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** parseDate("2026-11-05") is local midnight of that day. */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** addDays returns a new date n days later (n may be negative). */
export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** dayTitle(2026-11-05) = "Thu 5 Nov". */
export function dayTitle(d: Date): string {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function shortDay(d: Date): string {
  return DAYS[d.getDay()];
}

export function monthTitle(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** entries is "1 entry" or "n entries". */
export function entries(n: number): string {
  return n === 1 ? "1 entry" : `${n} entries`;
}

/** doneText is a label's toast: the range it covers when it came from the
 * timeline (tagging rows by id carries no total), else entries and time. */
export function doneText(d: { label: string; spans: number; ms: number }, range?: string): string {
  return range ? `Labelled ${range} · ${d.label}` : `${d.label} · ${entries(d.spans)}, ${dur(d.ms)}`;
}

export type Unit = "day" | "week" | "month";

/** firstDay is the weekday weeks start on (0 = Sunday): Monday unless
 *  config.toml's [display] week_start says otherwise. */
let firstDay = 1;
const WEEK_STARTS: Record<string, number> = { monday: 1, sunday: 0, saturday: 6 };

/** setWeekStart takes week_start as /api/status sends it: "monday",
 *  "sunday" or "saturday"; anything else is Monday. */
export function setWeekStart(name?: string) {
  firstDay = WEEK_STARTS[name ?? ""] ?? 1;
}

/** weekStartOf is the first day of d's week, at local midnight. */
export function weekStartOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() - firstDay + 7) % 7));
  return m;
}

/** weekHeads turns seven day names, Sunday first, into the order of a
 *  week. */
export function weekHeads(sundayFirst: string[]): string[] {
  return [...sundayFirst.slice(firstDay), ...sundayFirst.slice(0, firstDay)];
}

/** mondayOf is the Monday of d's week, at local midnight. */
export function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

/** stepDate moves the YYYY-MM-DD date by n units; a month step lands on the
 *  1st. Nothing goes past today. */
export function stepDate(date: string, unit: Unit, n: number, today = new Date()): string {
  const d = parseDate(date);
  let out = unit === "day" ? addDays(d, n) : unit === "week" ? addDays(d, 7 * n) : new Date(d.getFullYear(), d.getMonth() + n, 1);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (out > t) out = t;
  return isoDate(out);
}

/** holdsToday is whether the unit around date contains today: then there
 *  is no next one to step to. */
export function holdsToday(date: string, unit: Unit, today = new Date()): boolean {
  const d = parseDate(date);
  if (unit === "day") return isoDate(d) === isoDate(today);
  if (unit === "week") return isoDate(weekStartOf(d)) === isoDate(weekStartOf(today));
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
}

/** periodTitle names the unit around date: "Today", "Sat 10 Oct",
 *  "This week", "5–11 Oct", "Oct 2026". */
export function periodTitle(date: string, unit: Unit, today = new Date()): string {
  const d = parseDate(date);
  if (unit === "day") return holdsToday(date, unit, today) ? "Today" : dayTitle(d);
  if (unit === "week") {
    if (holdsToday(date, unit, today)) return "This week";
    const m = weekStartOf(d), s = addDays(m, 6);
    return m.getMonth() === s.getMonth()
      ? `${m.getDate()}–${s.getDate()} ${MONTHS[m.getMonth()]}`
      : `${m.getDate()} ${MONTHS[m.getMonth()]} – ${s.getDate()} ${MONTHS[s.getMonth()]}`;
  }
  return monthTitle(d);
}
