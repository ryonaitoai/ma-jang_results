'use client';

import { Delete } from 'lucide-react';

interface NumpadProps {
  onInput: (digit: string) => void;
  onDelete: () => void;
  onClear: () => void;
  showDecimal?: boolean;
}

export function Numpad({ onInput, onDelete, onClear, showDecimal = true }: NumpadProps) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [showDecimal ? '.' : 'C', '0', '⌫'],
  ];

  const handlePress = (key: string) => {
    if (!key) return;
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    if (key === '⌫') {
      onDelete();
    } else if (key === 'C') {
      onClear();
    } else {
      onInput(key);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {keys.flat().map((key, i) => (
        <button
          key={`${key}-${i}`}
          onClick={() => handlePress(key)}
          disabled={!key}
          className={`h-11 rounded-lg text-lg font-bold transition-all active:scale-95 disabled:opacity-0 ${
            key === '⌫'
              ? 'bg-mahjong-error/20 text-mahjong-error'
              : key === 'C'
                ? 'bg-mahjong-card text-mahjong-muted'
                : 'bg-mahjong-card text-mahjong-text hover:bg-mahjong-primary'
          }`}
        >
          {key === '⌫' ? <Delete size={18} className="mx-auto" /> : key}
        </button>
      ))}
    </div>
  );
}
