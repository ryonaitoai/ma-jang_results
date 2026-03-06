'use client';

import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-medium rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100';

  const variants = {
    primary: 'bg-mahjong-accent text-mahjong-surface hover:bg-mahjong-accent/90',
    secondary: 'bg-mahjong-primary text-mahjong-text hover:bg-mahjong-primary/80',
    danger: 'bg-mahjong-error text-white hover:bg-mahjong-error/90',
    ghost: 'bg-transparent text-mahjong-muted hover:bg-mahjong-primary/30',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2.5 text-base min-h-[44px]',
    lg: 'px-6 py-3 text-lg min-h-[52px]',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
