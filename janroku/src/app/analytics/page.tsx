'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GameWindow } from '@/components/ui/game-window';
import { formatPoints, formatAmount } from '@/lib/utils';

interface MemberStat {
  member: {
    id: string;
    name: string;
    avatarEmoji: string;
  };
  totalHanchan: number;
  totalSessions: number;
  totalPoints: number;
  totalAmount: number;
  averageRank: number;
  rankDistribution: Record<number, number>;
  rentaiRate: number;
  topRate: number;
  lastRate: number;
}

type SortKey = 'totalPoints' | 'averageRank' | 'topRate' | 'totalHanchan';

const RANK_COLORS = ['text-game-gold', 'text-game-cyan', 'text-game-orange', 'text-game-red'];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<MemberStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('totalPoints');

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/analytics');
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  const sorted = [...stats].sort((a, b) => {
    if (a.totalHanchan === 0 && b.totalHanchan === 0) return 0;
    if (a.totalHanchan === 0) return 1;
    if (b.totalHanchan === 0) return -1;
    switch (sortKey) {
      case 'totalPoints': return b.totalPoints - a.totalPoints;
      case 'averageRank': return a.averageRank - b.averageRank;
      case 'topRate': return b.topRate - a.topRate;
      case 'totalHanchan': return b.totalHanchan - a.totalHanchan;
    }
  });

  const hasAnyData = stats.some((s) => s.totalHanchan > 0);

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold text-game-gold mb-4">分析</h1>

      {isLoading ? (
        <div className="text-center text-game-muted py-12">読み込み中...</div>
      ) : !hasAnyData ? (
        <GameWindow>
          <div className="text-center py-4">
            <p className="text-3xl mb-2">📊</p>
            <p className="text-game-muted">まだ対局データがありません</p>
            <p className="text-sm text-game-dim mt-1">セッションを完了すると成績が表示されます</p>
          </div>
        </GameWindow>
      ) : (
        <>
          {/* Sort Buttons */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {([
              ['totalPoints', '収支'],
              ['averageRank', '平均順位'],
              ['topRate', 'トップ率'],
              ['totalHanchan', '対局数'],
            ] as [SortKey, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortKey(key)}
                className={`px-3 py-1.5 text-xs rounded-sm border whitespace-nowrap transition-colors ${
                  sortKey === key
                    ? 'border-game-gold text-game-gold bg-game-gold/10'
                    : 'border-felt-500 text-game-muted hover:border-felt-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Rankings Table */}
          <GameWindow title="メンバー成績ランキング">
            <div className="overflow-x-auto -mx-3">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="text-game-muted text-xs border-b border-felt-500">
                    <th className="py-2 pl-3 text-left w-8">#</th>
                    <th className="py-2 text-left">メンバー</th>
                    <th className="py-2 text-right">半荘</th>
                    <th className="py-2 text-right">収支</th>
                    <th className="py-2 text-right">平均順位</th>
                    <th className="py-2 text-right pr-3">1着率</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s, i) => {
                    if (s.totalHanchan === 0) return null;
                    const rank = i + 1;
                    return (
                      <tr key={s.member.id} className="border-b border-felt-500/30">
                        <td className={`py-3 pl-3 font-bold ${rank <= 3 ? RANK_COLORS[rank - 1] : 'text-game-muted'}`}>
                          {rank}
                        </td>
                        <td className="py-3">
                          <Link href={`/members/${s.member.id}`} className="flex items-center gap-2 hover:opacity-80">
                            <span className="text-base">{s.member.avatarEmoji}</span>
                            <span className="font-medium text-game-white">{s.member.name}</span>
                          </Link>
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums text-game-muted">
                          {s.totalHanchan}
                        </td>
                        <td className={`py-3 text-right font-mono tabular-nums font-bold ${s.totalPoints >= 0 ? 'text-game-green' : 'text-game-red'}`}>
                          {formatPoints(s.totalPoints)}
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums text-game-white">
                          {s.averageRank.toFixed(2)}
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums pr-3 text-game-gold">
                          {(s.topRate * 100).toFixed(0)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GameWindow>

          {/* Detail Cards */}
          <div className="mt-4 space-y-3">
            {sorted.filter((s) => s.totalHanchan > 0).map((s) => (
              <Link key={s.member.id} href={`/members/${s.member.id}`}>
                <GameWindow className="hover:border-game-gold/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{s.member.avatarEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-game-white">{s.member.name}</p>
                      <p className="text-xs text-game-muted">
                        {s.totalSessions}セッション / {s.totalHanchan}半荘
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-mono tabular-nums font-bold ${s.totalPoints >= 0 ? 'text-game-green' : 'text-game-red'}`}>
                        {formatPoints(s.totalPoints)}
                      </p>
                      {s.totalAmount !== 0 && (
                        <p className={`text-xs font-mono tabular-nums ${s.totalAmount >= 0 ? 'text-game-green' : 'text-game-red'}`}>
                          {formatAmount(s.totalAmount)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-game-muted">
                    <span>平均順位 <span className="text-game-white font-mono">{s.averageRank.toFixed(2)}</span></span>
                    <span>連対率 <span className="text-game-white font-mono">{(s.rentaiRate * 100).toFixed(0)}%</span></span>
                    <span className="flex gap-1">
                      {[1, 2, 3, 4].map((r) => (
                        <span key={r} className={RANK_COLORS[r - 1]}>
                          {s.rankDistribution[r] || 0}
                        </span>
                      ))}
                    </span>
                  </div>
                </GameWindow>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
