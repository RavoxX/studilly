import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names, letting later Tailwind utilities win over earlier ones.
 * Without this, a `className` prop passed into a component cannot override the
 * component's own defaults.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
