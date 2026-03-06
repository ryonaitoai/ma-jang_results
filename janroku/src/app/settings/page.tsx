import Link from 'next/link';
import { Users, BookOpen } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-game-gold mb-6">設定</h1>

      <div className="space-y-2">
        <Link
          href="/members"
          className="flex items-center gap-3 bg-felt-700 border border-felt-500/50 rounded-sm p-4 hover:bg-felt-600 transition-colors"
        >
          <Users size={20} className="text-game-green" />
          <div>
            <p className="font-medium">メンバー管理</p>
            <p className="text-xs text-game-muted">メンバーの追加・編集</p>
          </div>
        </Link>

        <div className="flex items-center gap-3 bg-felt-700 border border-felt-500/50 rounded-sm p-4 opacity-50">
          <BookOpen size={20} className="text-game-muted" />
          <div>
            <p className="font-medium">ルールプリセット</p>
            <p className="text-xs text-game-muted">Phase 3 で実装予定</p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-game-dim text-xs">
        <p>雀録 v0.1.0</p>
      </div>
    </div>
  );
}
