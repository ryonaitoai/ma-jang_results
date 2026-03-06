'use client';

import { useState, useEffect, useRef } from 'react';
import { Copy, Check } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import QRCode from 'qrcode';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export function ShareModal({ isOpen, onClose, sessionId }: ShareModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [viewUrl, setViewUrl] = useState('');

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const url = `${window.location.origin}/sessions/${sessionId}/view`;
      setViewUrl(url);

      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, url, {
          width: 200,
          margin: 2,
          color: {
            dark: '#e2e8f0',
            light: '#162b20',
          },
        });
      }
    }
  }, [isOpen, sessionId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(viewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="セッションを共有">
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-mahjong-muted text-center">
          他のメンバーにこのQRコードを見せるか、URLを共有してください
        </p>

        <div className="bg-mahjong-card rounded-xl p-4">
          <canvas ref={canvasRef} />
        </div>

        <div className="w-full">
          <div className="flex items-center gap-2 bg-mahjong-surface rounded-xl p-3">
            <input
              type="text"
              value={viewUrl}
              readOnly
              className="flex-1 bg-transparent text-xs text-mahjong-muted truncate"
            />
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-mahjong-card transition-colors flex-shrink-0"
            >
              {copied ? (
                <Check size={18} className="text-mahjong-accent" />
              ) : (
                <Copy size={18} className="text-mahjong-muted" />
              )}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-mahjong-muted text-center">
          LIVE 閲覧 - 5秒間隔で自動更新されます
        </p>
      </div>
    </Modal>
  );
}
