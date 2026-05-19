import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes (shadcn / Radix pattern). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
