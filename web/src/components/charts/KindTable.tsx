import { SERIES, kindLabel } from "@/lib/kinds";
import { dur } from "@/lib/format";

/** KindTable is a stacked chart's data as a table for screen readers: one
 *  row per bar, a column per kind that has any time. */
export function KindTable({ caption, rows }: { caption: string; rows: { label: string; byKind: Record<string, number> }[] }) {
  const kinds = SERIES.filter((k) => rows.some((r) => (r.byKind[k] ?? 0) > 0));
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr><th scope="col">When</th>{kinds.map((k) => <th key={k} scope="col">{kindLabel(k)}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}><th scope="row">{r.label}</th>{kinds.map((k) => <td key={k}>{dur(r.byKind[k] ?? 0)}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}
