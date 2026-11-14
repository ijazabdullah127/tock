import { Explain, Why } from "@/components/Explain";
import { KINDS, kindHelp, kindLabel } from "@/lib/kinds";
import { Swatch } from "@/components/charts/Swatch";

/** KindsHelp defines the kinds of time where their names first show: each
 *  with its colour and pattern and a line on what it counts as. */
export function KindsHelp({ label = "What they mean" }: { label?: string }) {
  return (
    <Explain title="Kinds of time" label={label} align="end" wide>
      <Why>Every category has a kind, set in the Library. The kind decides what its time counts as:</Why>
      <dl className="space-y-1.5">
        {[...KINDS, ""].map((k) => (
          <div key={k} className="grid grid-cols-[auto_1fr] items-baseline gap-x-2">
            <Swatch kind={k} className="translate-y-px" />
            <dt className="font-medium">{kindLabel(k)}</dt>
            <dd className="col-start-2 text-muted-foreground">{kindHelp(k)}</dd>
          </div>
        ))}
      </dl>
    </Explain>
  );
}
