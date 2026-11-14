import { kindClass, kindColor } from "@/lib/kinds";
import { cn } from "@/lib/utils";

/** Swatch is a kind's key in legends and tables. */
export function Swatch({ kind, className }: { kind: string; className?: string }) {
  return <i aria-hidden className={cn("inline-block h-2 w-2 shrink-0 rounded-sm", kindClass(kind), className)} style={{ backgroundColor: kindColor(kind) }} />;
}
