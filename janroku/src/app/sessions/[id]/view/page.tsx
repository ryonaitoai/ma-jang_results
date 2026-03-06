'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Trophy, Wifi, WifiOff } from 'lucide-react';
import { formatPoints } from '@/lib/utils';
import type { Member } from '@/types';

interface HanchanScore {
  memberId: string;
  rawScore: number | null;
  rank: number;
  point: number;
  chips: number | null;
  member: Member;
}

interface HanchanData {
  id: string;
  hanchanNumber: number;
  isVoid: boolean;
  scores: HanchanScore[];
}

interface SessionInfo {
  id: string;
  date: string;
  status: string;
  chipEnabled: boolean;
  rateValue: number;
}

interface ScoresResponse {
  session: SessionInfo;
  members: { memberId: string; seatOrder: number; member: Member }[];
  hanchan: HanchanData[];
  lastUpdated: string;
}

const POLL_INTERVAL = 5000;

export default function SessionViewPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [data, setData] = useState<ScoresResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [newHanchan, setNewHanchan] = useState(false);
  const prevHanchanCount = useRef(0);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/scores`);
      if (!res.ok) return;
      const newData: ScoresResponse = await res.json();

      // Check if new hanchan was added
      const activeCount = newData.hanchan.filter((h) => !h.isVoid).length;
      if (prevHanchanCount.current > 0 && activeCount > prevHanchanCount.current) {
        setNewHanchan(true);
        setTimeout(() => setNewHanchan(false), 3000);
      }
      prevHanchanCount.current = activeCount;

      // Only update if data changed
      if (newData.lastUpdated !== lastUpdated) {
        setData(newData);
        setLastUpdated(newData.lastUpdated);
      }
      setIsConnected(true);
      setSecondsAgo(0);
    } catch {
      setIsConnected(false);
    }
  }, [sessionId, lastUpdated]);

  useEffect(() => {
    fetchScores();
    const interval = setInterval(fetchScores, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchScores]);

  // Update "seconds ago" counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-mahjong-surface">
        <div className="text-center text-mahjong-muted">
          <div className="animate-pulse text-4xl mb-4">🀄</div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  const activeHanchan = data.hanchan.filter((h) => !h.isVoid);
  const memberOrder = data.members.sort((a, b) => a.seatOrder - b.seatOrder);

  // Calculate totals
  const totals = new Map<string, { points: number; chips: number }>();
  for (const m of memberOrder) {
    totals.set(m.memberId, { points: 0, chips: 0 });
  }
  for (const h of activeHanchan) {
    for (const s of h.scores) {
      const t = totals.get(s.memberId);
      if (t) {
        t.points += s.point;
        t.chips += s.chips || 0;
      }
    }
  }

  const ranked = [...memberOrder].sort((a, b) => {
    const ta = totals.get(a.memberId)?.points ?? 0;
    const tb = totals.get(b.memberId)?.points ?? 0;
    return tb - ta;
  });

  return (
    <div className="flex flex-col min-h-screen bg-mahjong-surface">
      {/* Live indicator header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">LIVE</span>
          </div>
          <h1 className="text-lg font-bold">雀録</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-mahjong-muted">
          {isConnected ? (
            <Wifi size={14} className="text-mahjong-accent" />
          ) : (
            <WifiOff size={14} className="text-mahjong-error" />
          )}
          <span>{secondsAgo}秒前</span>
        </div>
      </div>

      {/* New hanchan toast */}
      {newHanchan && (
        <div className="mx-4 mb-2 bg-mahjong-accent/20 text-mahjong-accent text-sm text-center py-2 rounded-lg animate-pulse">
          新しい半荘が追加されました
        </div>
      )}

      {/* Ranking Summary */}
      <div className="px-4 pb-2">
        <div className="bg-mahjong-card rounded-xl p-3">
          <div className="grid grid-cols-4 gap-2">
            {ranked.map((m, i) => {
              const t = totals.get(m.memberId);
              const points = t?.points ?? 0;
              const amount = Math.round(points * (data.session.rateValue || 100));
              return (
                <div key={m.memberId} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {i === 0 && <Trophy size={12} className="text-mahjong-warning" />}
                    <span className="text-xs text-mahjong-muted">{i + 1}位</span>
                  </div>
                  <span className="text-sm">{m.member.avatarEmoji}</span>
                  <p className="text-xs font-medium truncate">{m.member.name}</p>
                  <p
                    className={`text-sm font-mono tabular-nums font-bold ${
                      points >= 0 ? 'text-mahjong-accent' : 'text-mahjong-error'
                    }`}
                  >
                    {formatPoints(points)}
                  </p>
                  <p className="text-xs text-mahjong-muted tabular-nums">
                    {amount >= 0 ? '+' : ''}¥{Math.abs(amount).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Score Table */}
      <div className="flex-1 overflow-x-auto px-4 pb-8">
        {activeHanchan.length === 0 ? (
          <div className="text-center text-mahjong-muted py-12">
            <p className="text-3xl mb-2">⏳</p>
            <p>まだ半荘がありません</p>
            <p className="text-sm">対局の開始をお待ちください</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-mahjong-muted text-xs border-b border-mahjong-card">
                <th className="py-2 text-left w-10">#</th>
                {memberOrder.map((m) => (
                  <th key={m.memberId} className="py-2 text-center">
                    <span className="text-base">{m.member.avatarEmoji}</span>
                    <br />
                    <span className="text-[10px]">{m.member.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeHanchan.map((h) => (
                <tr key={h.id} className="border-b border-mahjong-card/50">
                  <td className="py-2 text-mahjong-muted text-xs">{h.hanchanNumber}</td>
                  {memberOrder.map((m) => {
                    const score = h.scores.find((s) => s.memberId === m.memberId);
                    if (!score) return <td key={m.memberId} className="py-2 text-center">-</td>;
                    return (
                      <td key={m.memberId} className="py-2 text-center">
                        {score.rawScore !== null && (
                          <div className="font-mono tabular-nums text-xs">
                            {(score.rawScore / 1000).toFixed(0)}
                          </div>
                        )}
                        <div
                          className={`text-[10px] font-mono tabular-nums ${
                            score.point >= 0 ? 'text-mahjong-accent' : 'text-mahjong-error'
                          }`}
                        >
                          {formatPoints(score.point)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="font-bold border-t-2 border-mahjong-accent/30">
                <td className="py-3 text-mahjong-muted text-xs">計</td>
                {memberOrder.map((m) => {
                  const t = totals.get(m.memberId);
                  return (
                    <td key={m.memberId} className="py-3 text-center">
                      <div
                        className={`font-mono tabular-nums text-sm ${
                          (t?.points ?? 0) >= 0 ? 'text-mahjong-accent' : 'text-mahjong-error'
                        }`}
                      >
                        {formatPoints(t?.points ?? 0)}
                      </div>
                      {data.session.chipEnabled && (
                        <div className="text-[10px] text-mahjong-warning font-mono">
                          chip:{t?.chips ?? 0}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Session status */}
      {data.session.status === 'settled' && (
        <div className="fixed bottom-0 left-0 right-0 bg-mahjong-card border-t border-mahjong-primary/30 p-3 text-center text-sm text-mahjong-muted">
          このセッションは清算済みです
        </div>
      )}
    </div>
  );
}
