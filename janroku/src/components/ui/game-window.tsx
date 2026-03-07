import { cn } from '@/lib/utils';

interface GameWindowProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  title?: string;
  compact?: boolean;
}

export function GameWindow({ children, className, padding = true, title, compact }: GameWindowProps) {
  return (
    <div className={cn('game-window', className)}>
      <div className="game-window-inner" />
      <div className={cn('relative', padding && (compact ? 'px-3 py-2' : 'p-3'))}>
        {title && (
          <p className={cn('text-game-gold font-bold', compact ? 'text-xs mb-1' : 'text-sm mb-2')}>{title}</p>
        )}
        {children}
      </div>
    </div>
  );
}
