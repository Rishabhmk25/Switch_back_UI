import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Class merger used by the Kokonut UI components (`@/lib/utils`). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
