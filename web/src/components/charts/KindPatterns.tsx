import { kindColor } from "@/lib/kinds";

/** KindPatterns defines, once per page, the SVG patterns kindFill points
 *  at: Distracting striped, Browsing dotted, each over its colour. */
export function KindPatterns() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <pattern id="k-pat-distract" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill={kindColor("distract")} />
          <rect width="1.5" height="5" fill="hsl(var(--background))" fillOpacity={0.55} />
        </pattern>
        <pattern id="k-pat-browse" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill={kindColor("browse")} />
          <circle cx="2" cy="2" r="1" fill="hsl(var(--background))" fillOpacity={0.6} />
        </pattern>
      </defs>
    </svg>
  );
}
