import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toFixed(digits);
}

export function formatPct(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${formatNumber(n, 1)}%`;
}
