import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// WCAG AA: the text colours of both themes keep 4.5:1 on every surface
// text sits on. Reads the tokens from styles.css, so a new shade is checked.
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function tokens(block: string): Record<string, [number, number, number]> {
  const out: Record<string, [number, number, number]> = {};
  for (const m of block.matchAll(/--([\w-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g)) out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  return out;
}

function rgb([h, s, l]: [number, number, number]): number[] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))));
}
const lum = (c: number[]) => c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((t, v, i) => t + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a: number[], b: number[]) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const dark = tokens(css.slice(css.indexOf(":root {"), css.indexOf("@media (prefers-color-scheme: light)")));
const light = tokens(css.slice(css.indexOf(':root[data-theme="light"]')));

for (const [name, t] of [["dark", dark], ["light", light]] as const) {
  test(`${name}: text tokens keep 4.5:1`, () => {
    for (const fg of ["foreground", "muted-foreground", "faint-text"]) {
      for (const bg of ["background", "card", "popover", "secondary"]) {
        expect(t[fg] && t[bg], `${fg} or ${bg} missing`).toBeTruthy();
        expect(ratio(rgb(t[fg]), rgb(t[bg])), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
}
