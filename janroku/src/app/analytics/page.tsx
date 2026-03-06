import { GameWindow } from '@/components/ui/game-window';

export default function AnalyticsPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-game-gold mb-6">分析</h1>
      <GameWindow>
        <div className="text-center">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-game-muted">Phase 2 で実装予定</p>
          <p className="text-sm text-game-dim mt-1">
            個人成績・グループ分析・レーティング
          </p>
        </div>
      </GameWindow>
    </div>
  );
}
