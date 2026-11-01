import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Blinks a filter once in a while to point out that it is set (see useFilterHint).
export const FILTER_HINT = 'motion-safe:animate-filter-hint';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
