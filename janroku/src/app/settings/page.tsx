import Link from 'next/link';
import { Users, BookOpen } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-6">設定</h1>

      <div className="space-y-2">
        <Link
          href="/members"
          className="flex items-center gap-3 bg-mahjong-card rounded-xl p-4"
        >
          <Users size={20} className="text-mahjong-accent" />
          <div>
            <p className="font-medium">メンバー管理</p>
            <p className="text-xs text-mahjong-muted">メンバーの追加・編集</p>
          </div>
        </Link>

        <div className="flex items-center gap-3 bg-mahjong-card rounded-xl p-4 opacity-50">
          <BookOpen size={20} className="text-mahjong-muted" />
          <div>
            <p className="font-medium">ルールプリセット</p>
            <p className="text-xs text-mahjong-muted">Phase 3 で実装予定</p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-mahjong-muted text-xs">
        <p>雀録 v0.1.0</p>
      </div>
    </div>
  );
}
