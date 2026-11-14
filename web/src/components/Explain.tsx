import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Explain turns a number or its name into a button that opens how it is
 *  made. The trigger keeps its text and gains a dotted underline; screen
 *  readers hear "<title>: how it's counted", and the panel that opens is a
 *  labelled dialog, reached and closed by keyboard like any popover. */
export function Explain({ title, children, label, className, align = "start", wide }: {
  title: string; // what the number is, e.g. "Focus time"
  label: ReactNode; // the trigger's visible text
  children: ReactNode; // the explanation
  className?: string;
  align?: "start" | "center" | "end";
  wide?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded-sm text-left underline decoration-dotted decoration-from-font underline-offset-[3px] [text-decoration-color:hsl(var(--faint))] hover:text-foreground hover:[text-decoration-color:currentColor] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          {label}
          <span className="sr-only">: how it's counted</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} aria-label={title} className={cn("space-y-2 text-sm leading-snug", wide ? "w-96" : "w-80")}>
        <h3 className="font-medium">{title}</h3>
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** Why is one line of an explanation, muted. */
export function Why({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>;
}

/** Sum is a small two-column table of what adds up to a number. */
export function Sum({ rows, total }: { rows: [ReactNode, ReactNode][]; total?: [ReactNode, ReactNode] }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt>{k}</dt>
          <dd className="num text-right">{v}</dd>
        </div>
      ))}
      {total && (
        <div className="contents font-medium">
          <dt className="border-t pt-1">{total[0]}</dt>
          <dd className="num border-t pt-1 text-right">{total[1]}</dd>
        </div>
      )}
    </dl>
  );
}
