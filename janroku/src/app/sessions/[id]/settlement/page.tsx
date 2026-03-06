'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Copy, Check, Lock, ArrowRight, Minus, Plus } from 'lucide-react';
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

const CHIP_POINT_OPTIONS = [3, 5] as const;

export default function SettlementPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [settledResults, setSettledResults] = useState<MemberResult[]>([]);
  const [settledTransfers, setSettledTransfers] = useState<Transfer[]>([]);
  const [isSettled, setIsSettled] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Chip input state
  const [chipPointValue, setChipPointValue] = useState<number>(3);
  const [chipCounts, setChipCounts] = useState<Record<string, number>>({});

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data: SessionData = await res.json();
      setSession(data);

      if (data.status === 'settled') {
        setIsSettled(true);
        const settleRes = await fetch(`/api/sessions/${sessionId}/settlement`);
        if (settleRes.ok) {
          const settleData = await settleRes.json();
          setSettledResults(settleData.settlements);
          setSettledTransfers(settleData.transfers);
        }
      } else {
        // Initialize chip counts for all members
        const counts: Record<string, number> = {};
        for (const m of data.members) {
          counts[m.memberId] = 0;
        }
        setChipCounts(counts);
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Point totals from hanchan (without chips)
  const memberPointTotals = useMemo(() => {
    if (!session || isSettled) return new Map<string, number>();
    const activeHanchan = session.hanchan.filter((h) => !h.isVoid);
    const totals = new Map<string, number>();
    for (const m of session.members) {
      totals.set(m.memberId, 0);
    }
    for (const h of activeHanchan) {
      for (const s of h.scores) {
        const current = totals.get(s.memberId);
        if (current !== undefined) {
          totals.set(s.memberId, current + s.point);
        }
      }
    }
    return totals;
  }, [session, isSettled]);

  // Results with chips included (reactive to chip input changes)
  const { results, transfers } = useMemo(() => {
    if (isSettled) {
      return { results: settledResults, transfers: settledTransfers };
    }
    if (!session) return { results: [] as MemberResult[], transfers: [] as Transfer[] };

    const memberMap = new Map(session.members.map((m) => [m.memberId, m.member.name]));
    const rateValue = session.rateValue || 100;

    const previewResults: MemberResult[] = [];
    for (const [memberId, points] of memberPointTotals) {
      const chips = chipCounts[memberId] || 0;
      const chipAmount = chips * chipPointValue * rateValue;
      const pointAmount = Math.round(points * rateValue);
      previewResults.push({
        memberId,
        memberName: memberMap.get(memberId) || '',
        totalPoint: Math.round(points * 10) / 10,
        totalChips: chips,
        totalAmount: pointAmount + chipAmount,
      });
    }

    previewResults.sort((a, b) => b.totalAmount - a.totalAmount);

    const balances = previewResults.map((r) => ({
      memberId: r.memberId,
      memberName: r.memberName,
      amount: r.totalAmount,
    }));

    return {
      results: previewResults,
      transfers: calculateSettlementTransfers(balances),
    };
  }, [session, isSettled, settledResults, settledTransfers, memberPointTotals, chipCounts, chipPointValue]);

  const chipCountTotal = Object.values(chipCounts).reduce((sum, c) => sum + c, 0);

  const updateChipCount = (memberId: string, delta: number) => {
    setChipCounts((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || 0) + delta,
    }));
  };

  const handleSettle = async () => {
    if (!confirm('清算を確定しますか？確定後は変更できません。')) return;
    setIsSettling(true);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chipCounts,
          chipPointValue,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || '清算に失敗しました');
        setIsSettling(false);
        return;
      }

      const data = await res.json();
      setSettledResults(data.settlements);
      setSettledTransfers(data.transfers);
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
      const chipText = r.totalChips !== 0 ? ` (chip: ${r.totalChips > 0 ? '+' : ''}${r.totalChips})` : '';
      text += `${r.memberName}: ${formatPoints(r.totalPoint)}pt${chipText} → ${formatAmount(r.totalAmount)}\n`;
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
          {isSettled ? '清算結果' : '清算'}
        </h1>
        {isSettled && <Lock size={16} className="text-mahjong-muted" />}
      </div>

      {/* Chip Input Section */}
      {!isSettled && (
        <section className="mb-6">
          <h2 className="text-sm text-mahjong-muted mb-3 uppercase tracking-wider">
            チップ
          </h2>
          <div className="bg-mahjong-card rounded-xl p-4">
            {/* Chip point value selector */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-mahjong-muted">1枚 =</span>
              <div className="flex gap-1">
                {CHIP_POINT_OPTIONS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setChipPointValue(v)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      chipPointValue === v
                        ? 'bg-mahjong-accent text-mahjong-surface'
                        : 'bg-mahjong-surface text-mahjong-muted'
                    }`}
                  >
                    +{v}pt
                  </button>
                ))}
              </div>
              <span className="text-xs text-mahjong-muted ml-auto">
                (¥{(chipPointValue * (session?.rateValue || 100)).toLocaleString()}/枚)
              </span>
            </div>

            {/* Per-member chip count */}
            <div className="space-y-2">
              {session?.members.map((m) => {
                const count = chipCounts[m.memberId] || 0;
                return (
                  <div key={m.memberId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{m.member.avatarEmoji}</span>
                      <span className="text-sm font-medium truncate">{m.member.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateChipCount(m.memberId, -1)}
                        className="w-8 h-8 rounded-lg bg-mahjong-surface flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Minus size={14} />
                      </button>
                      <span
                        className={`w-12 text-center font-mono tabular-nums text-sm font-bold ${
                          count > 0
                            ? 'text-mahjong-accent'
                            : count < 0
                              ? 'text-mahjong-error'
                              : 'text-mahjong-muted'
                        }`}
                      >
                        {count > 0 ? `+${count}` : count}
                      </span>
                      <button
                        onClick={() => updateChipCount(m.memberId, 1)}
                        className="w-8 h-8 rounded-lg bg-mahjong-surface flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chip count validation */}
            <div className={`text-xs text-center mt-3 ${chipCountTotal === 0 ? 'text-mahjong-muted' : 'text-mahjong-warning'}`}>
              合計: {chipCountTotal > 0 ? '+' : ''}{chipCountTotal}枚
              {chipCountTotal !== 0 && ' (0になるのが正常です)'}
            </div>
          </div>
        </section>
      )}

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
                {r.totalChips !== 0 && (
                  <p className="text-xs text-mahjong-warning font-mono tabular-nums">
                    chip: {r.totalChips > 0 ? '+' : ''}{r.totalChips} ({r.totalChips > 0 ? '+' : ''}{r.totalChips * chipPointValue}pt)
                  </p>
                )}
                <p
                  className={`text-sm font-mono tabular-nums ${
                    r.totalAmount >= 0 ? 'text-mahjong-accent' : 'text-mahjong-error'
                  }`}
                >
                  {formatAmount(r.totalAmount)}
                </p>
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
