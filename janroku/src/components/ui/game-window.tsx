import { cn } from '@/lib/utils';

interface GameWindowProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function GameWindow({ children, className, padding = true }: GameWindowProps) {
  return (
    <div className={cn('game-window', className)}>
      <div className="game-window-inner" />
      <div className={cn('relative', padding && 'p-3')}>
        {children}
      </div>
    </div>
  );
}
