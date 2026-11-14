import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type KeyEv = { key: string; target: unknown; currentTarget: unknown; preventDefault: () => void };

/** pressable makes a clickable row or item reachable by keyboard: it takes
 *  focus, and Enter or Space on it (not on a button inside it) acts like a
 *  click. Pair it with PRESSABLE for the focus ring. */
export function pressable(act: () => void) {
  return {
    tabIndex: 0,
    onClick: act,
    onKeyDown: (e: KeyEv) => {
      if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
      e.preventDefault();
      act();
    },
  };
}

export const PRESSABLE = "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
