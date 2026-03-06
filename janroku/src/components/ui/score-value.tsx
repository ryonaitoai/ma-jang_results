import { cn } from '@/lib/utils';

interface ScoreValueProps {
  value: number;
  format?: (v: number) => string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreValue({ value, format, className, size = 'md' }: ScoreValueProps) {
  const color = value > 0
    ? 'text-game-green'
    : value < 0
      ? 'text-game-red'
      : 'text-game-muted';

  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
  };

  const formatted = format
    ? format(value)
    : (value > 0 ? '+' : '') + value.toFixed(1);

  return (
    <span className={cn('font-mono font-bold tabular-nums', color, sizes[size], className)}>
      {formatted}
    </span>
  );
}
