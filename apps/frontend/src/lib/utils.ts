/**
 * @file lib/utils.ts
 * @description Class name merge utility — combines clsx and tailwind-merge.
 * @module @polaris/frontend/lib
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely, resolving conflicts intelligently. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
