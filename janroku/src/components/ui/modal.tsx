'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="w-full sm:max-w-md game-window rounded-t-sm sm:rounded-sm p-0 max-h-[85vh] overflow-y-auto">
        <div className="game-window-inner rounded-t-sm sm:rounded-sm" />
        <div className="relative p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-game-gold">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-sm hover:bg-felt-600 transition-colors text-game-muted"
            >
              <X size={20} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
