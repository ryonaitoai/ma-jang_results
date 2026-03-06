import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function formatPoints(points: number): string {
  const sign = points >= 0 ? '+' : '';
  return `${sign}${points.toFixed(1)}`;
}

export function formatAmount(amount: number): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}¥${Math.abs(amount).toLocaleString()}`;
}

export function formatScore(score: number): string {
  return score.toLocaleString();
}

export function getRankLabel(rating: number): string {
  if (rating >= 1800) return '雀聖';
  if (rating >= 1700) return '雀豪';
  if (rating >= 1600) return '雀傑';
  if (rating >= 1500) return '雀士';
  if (rating >= 1400) return '初段';
  if (rating >= 1300) return '1級';
  if (rating >= 1200) return '2級';
  return '3級';
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
