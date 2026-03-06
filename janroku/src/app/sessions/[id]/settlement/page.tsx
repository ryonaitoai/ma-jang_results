'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Copy, Check, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPoints, formatAmount } from '@/lib/utils';
import { calculateSettlementTransfers } from '@/lib/mahjong/settlement';
import type { Member } from '@/types';

interface MemberResult {
  memberId: string;
  memberName: string;
  totalPoint: number;
  totalChips: number;
  totalAmount: number;
}

interface Transfer {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: number;
}

interface SessionData {
  id: string;
  status: string;
  chipEnabled: boolean;
  rateValue: number;
  members: { memberId: string; member: Member }[];
  hanchan: { id: string; isVoid: boolean; scores: { memberId: string; point: number; umaPoint: number | null; chips: number | null }[] }[];
}

export default function SettlementPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [results, setResults] = useState<MemberResult[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isSettled, setIsSettled] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data: SessionData = await res.json();
      setSession(data);

      if (data.status === 'settled') {
        setIsSettled(true);
        // Fetch settlement data
        const settleRes = await fetch(`/api/sessions/${sessionId}/settlement`);
        if (settleRes.ok) {
          const settleData = await settleRes.json();
          setResults(settleData.settlements);
          setTransfers(settleData.transfers);
        }
      } else {
        // Calculate preview
        calculatePreview(data);
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const calculatePreview = (data: SessionData) => {
    const activeHanchan = data.hanchan.filter((h) => !h.isVoid);
    const memberMap = new Map(data.members.map((m) => [m.memberId, m.member.name]));

    const memberTotals = new Map<string, { points: number; chips: number }>();
    for (const m of data.members) {
      memberTotals.set(m.memberId, { points: 0, chips: 0 });
    }

    for (const h of activeHanchan) {
      for (const s of h.scores) {
        const t = memberTotals.get(s.memberId);
        if (t) {
          t.points += s.point;
          t.chips += s.chips || 0;
        }
      }
    }

    const previewResults: MemberResult[] = [];
    for (const [memberId, totals] of memberTotals) {
      let amount = Math.round(totals.points * (data.rateValue || 100));
      if (data.chipEnabled) {
        amount += totals.chips * 100; // TODO: use chip value from session
      }
      previewResults.push({
        memberId,
        memberName: memberMap.get(memberId) || '',
        totalPoint: Math.round(totals.points * 10) / 10,
        totalChips: totals.chips,
        totalAmount: amount,
      });
    }

    previewResults.sort((a, b) => b.totalAmount - a.totalAmount);
    setResults(previewResults);

    // Calculate transfers preview
    const balances = previewResults.map((r) => ({
      memberId: r.memberId,
      memberName: r.memberName,
      amount: r.totalAmount,
    }));
    setTransfers(calculateSettlementTransfers(balances));
  };

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleSettle = async () => {
    if (!confirm('清算を確定しますか？確定後は変更できません。')) return;
    setIsSettling(true);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/settle`, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || '清算に失敗しました');
        setIsSettling(false);
        return;
      }

      const data = await res.json();
      setResults(data.settlements);
      setTransfers(data.transfers);
      setIsSettled(true);
    } catch (error) {
      console.error('Failed to settle:', error);
      setIsSettling(false);
    }
  };

  const generateShareText = () => {
    let text = `🀄 雀録 清算結果\n`;
    text += `━━━━━━━━━━━━━━\n`;
    for (const r of results) {
      text += `${r.memberName}: ${formatPoints(r.totalPoint)}pt (${formatAmount(r.totalAmount)})\n`;
    }
    text += `━━━━━━━━━━━━━━\n`;
    text += `💰 送金\n`;
    for (const t of transfers) {
      text += `${t.fromName} → ${t.toName}: ¥${t.amount.toLocaleString()}\n`;
    }
    return text;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-mahjong-muted">読み込み中...</div>;
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">
          {isSettled ? '清算結果' : '清算プレビュー'}
        </h1>
        {isSettled && <Lock size={16} className="text-mahjong-muted" />}
      </div>

      {/* Results */}
      <section className="mb-6">
        <h2 className="text-sm text-mahjong-muted mb-3 uppercase tracking-wider">
          成績
        </h2>
        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={r.memberId}
              className="flex items-center justify-between bg-mahjong-card rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-mahjong-muted w-6">{i + 1}位</span>
                <span className="font-medium">{r.memberName}</span>
              </div>
              <div className="text-right">
                <p
                  className={`font-mono tabular-nums font-bold ${
                    r.totalPoint >= 0 ? 'text-mahjong-accent' : 'text-mahjong-error'
                  }`}
                >
                  {formatPoints(r.totalPoint)}
                </p>
                <p
                  className={`text-sm font-mono tabular-nums ${
                    r.totalAmount >= 0 ? 'text-mahjong-accent' : 'text-mahjong-error'
                  }`}
                >
                  {formatAmount(r.totalAmount)}
                </p>
                {session?.chipEnabled && r.totalChips !== 0 && (
                  <p className="text-xs text-mahjong-warning">
                    chip: {r.totalChips > 0 ? '+' : ''}{r.totalChips}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Transfers */}
      {transfers.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm text-mahjong-muted mb-3 uppercase tracking-wider">
            送金指示
          </h2>
          <div className="space-y-2">
            {transfers.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-mahjong-card rounded-xl p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-mahjong-error">{t.fromName}</span>
                  <ArrowRight size={16} className="text-mahjong-muted" />
                  <span className="font-medium text-mahjong-accent">{t.toName}</span>
                </div>
                <span className="font-mono tabular-nums font-bold">
                  ¥{t.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={handleCopy}
          variant="secondary"
          className="w-full"
          size="md"
        >
          {copied ? (
            <span className="flex items-center justify-center gap-2">
              <Check size={18} />
              コピーしました
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Copy size={18} />
              結果をコピー
            </span>
          )}
        </Button>

        {!isSettled && (
          <Button
            onClick={handleSettle}
            disabled={isSettling || results.length === 0}
            className="w-full"
            size="lg"
          >
            {isSettling ? '清算中...' : '清算を確定する'}
          </Button>
        )}
      </div>
    </div>
  );
}
