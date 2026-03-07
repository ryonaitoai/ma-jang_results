'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, TrendingDown, Target, Flame } from 'lucide-react';
import { GameWindow } from '@/components/ui/game-window';
import { formatPoints, formatAmount } from '@/lib/utils';

interface MemberStats {
  member: {
    id: string;
    name: string;
    avatarEmoji: string;
  };
  totalHanchan: number;
  totalSessions: number;
  settledSessions: number;
  totalPoints: number;
  totalAmount: number;
  averageRank: number;
  rankDistribution: Record<number, number>;
  rankRates: Record<number, number>;
  rentaiRate: number;
  averagePoints: number;
  maxPoints: number;
  minPoints: number;
  tobiCount: number;
  tobiRate: number;
  recentScores: { date: string; point: number; rank: number }[];
}

const RANK_COLORS = ['text-game-gold', 'text-game-cyan', 'text-game-orange', 'text-game-red'];
const RANK_BAR_COLORS = ['bg-game-gold', 'bg-game-cyan', 'bg-game-orange', 'bg-game-red'];

export default function MemberStatsPage() {
  const params = useParams();
  const router = useRouter();
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`/api/members/${params.id}/stats`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch member stats:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, [params.id]);

  if (isLoading) {
    return <div className="text-center text-game-muted py-12">読み込み中...</div>;
  }

  if (!stats) {
    return <div className="text-center text-game-muted py-12">メンバーが見つかりません</div>;
  }

  const { member } = stats;
  const hasData = stats.totalHanchan > 0;

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-sm hover:bg-felt-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <span className="text-3xl">{member.avatarEmoji}</span>
        <div>
          <h1 className="text-xl font-bold text-game-gold">{member.name}</h1>
          <p className="text-sm text-game-muted">
            {stats.totalSessions}セッション / {stats.totalHanchan}半荘
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="text-center text-game-muted py-12">
          <p className="text-3xl mb-2">📊</p>
          <p>まだ対局データがありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <GameWindow title="通算収支" compact>
              <div className="text-center py-2">
                <p className={`text-2xl font-mono font-bold tabular-nums ${stats.totalPoints >= 0 ? 'text-game-green' : 'text-game-red'}`}>
                  {formatPoints(stats.totalPoints)}
                </p>
                {stats.settledSessions > 0 && (
                  <p className={`text-sm font-mono tabular-nums mt-1 ${stats.totalAmount >= 0 ? 'text-game-green' : 'text-game-red'}`}>
                    {formatAmount(stats.totalAmount)}
                  </p>
                )}
              </div>
            </GameWindow>
            <GameWindow title="平均順位" compact>
              <div className="text-center py-2">
                <p className="text-2xl font-mono font-bold tabular-nums text-game-white">
                  {stats.averageRank.toFixed(2)}
                </p>
                <p className="text-xs text-game-muted mt-1">
                  連対率 {(stats.rentaiRate * 100).toFixed(1)}%
                </p>
              </div>
            </GameWindow>
          </div>

          {/* Rank Distribution */}
          <GameWindow title="順位分布">
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4].map((rank) => {
                const count = stats.rankDistribution[rank] || 0;
                const rate = stats.rankRates[rank] || 0;
                const maxRate = Math.max(...Object.values(stats.rankRates));
                const barWidth = maxRate > 0 ? (rate / maxRate) * 100 : 0;
                return (
                  <div key={rank} className="flex items-center gap-3">
                    <span className={`text-sm font-bold w-8 ${RANK_COLORS[rank - 1]}`}>
                      {rank}着
                    </span>
                    <div className="flex-1 h-6 bg-felt-900 rounded-sm overflow-hidden">
                      <div
                        className={`h-full ${RANK_BAR_COLORS[rank - 1]} transition-all duration-500`}
                        style={{ width: `${barWidth}%`, opacity: 0.8 }}
                      />
                    </div>
                    <span className="text-sm font-mono tabular-nums w-20 text-right text-game-white">
                      {count}回 ({(rate * 100).toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </GameWindow>

          {/* Detail Stats */}
          <GameWindow title="詳細成績">
            <div className="divide-y divide-felt-500/30">
              <StatRow icon={<Target size={16} className="text-game-cyan" />} label="平均獲得pt" value={formatPoints(stats.averagePoints)} />
              <StatRow icon={<Trophy size={16} className="text-game-gold" />} label="最高獲得pt" value={formatPoints(stats.maxPoints)} valueColor="text-game-green" />
              <StatRow icon={<TrendingDown size={16} className="text-game-red" />} label="最低獲得pt" value={formatPoints(stats.minPoints)} valueColor="text-game-red" />
              <StatRow icon={<Flame size={16} className="text-game-orange" />} label="トビ" value={`${stats.tobiCount}回 (${(stats.tobiRate * 100).toFixed(1)}%)`} />
            </div>
          </GameWindow>

          {/* Recent Scores */}
          <GameWindow title="直近の成績">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-game-muted text-xs border-b border-felt-500">
                    <th className="py-2 text-left">日付</th>
                    <th className="py-2 text-center">順位</th>
                    <th className="py-2 text-right">ポイント</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentScores.map((s, i) => (
                    <tr key={i} className="border-b border-felt-500/30">
                      <td className="py-2 text-game-muted text-xs font-mono">{s.date}</td>
                      <td className={`py-2 text-center font-bold ${RANK_COLORS[s.rank - 1]}`}>
                        {s.rank}着
                      </td>
                      <td className={`py-2 text-right font-mono tabular-nums font-bold ${s.point >= 0 ? 'text-game-green' : 'text-game-red'}`}>
                        {formatPoints(s.point)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GameWindow>
        </div>
      )}
    </div>
  );
}

function StatRow({ icon, label, value, valueColor }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-game-muted">{label}</span>
      </div>
      <span className={`font-mono tabular-nums font-bold ${valueColor || 'text-game-white'}`}>
        {value}
      </span>
    </div>
  );
}
