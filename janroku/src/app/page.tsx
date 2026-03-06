'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, ChevronRight, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Member } from '@/types';

interface SessionSummary {
  id: string;
  date: string;
  status: string;
  members: { memberId: string; member: Member }[];
  hanchan: { id: string; isVoid: boolean }[];
}

export default function HomePage() {
  const [activeSessions, setActiveSessions] = useState<SessionSummary[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      const data: SessionSummary[] = await res.json();

      setActiveSessions(data.filter((s) => s.status === 'active'));
      setRecentSessions(data.filter((s) => s.status === 'settled').slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mahjong-accent">雀録</h1>
          <p className="text-xs text-mahjong-muted">セットマージャン成績管理</p>
        </div>
        <Link href="/sessions/new">
          <Button size="sm">
            <Plus size={18} className="mr-1 inline" />
            新規対局
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center text-mahjong-muted py-12">読み込み中...</div>
      ) : (
        <>
          {/* Active Sessions */}
          {activeSessions.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm text-mahjong-muted mb-3 uppercase tracking-wider">
                進行中のセッション
              </h2>
              <div className="space-y-2">
                {activeSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="block bg-mahjong-accent/10 border border-mahjong-accent/30 rounded-xl p-4 transition-all hover:bg-mahjong-accent/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Gamepad2 size={20} className="text-mahjong-accent" />
                        <div>
                          <p className="font-medium">{session.date}</p>
                          <p className="text-xs text-mahjong-muted">
                            {session.members.map((m) => m.member.name).join(', ')} ・{' '}
                            {session.hanchan.filter((h) => !h.isVoid).length}半荘
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-mahjong-muted" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Quick Start */}
          {activeSessions.length === 0 && (
            <section className="mb-6">
              <div className="bg-mahjong-card rounded-xl p-6 text-center">
                <p className="text-4xl mb-3">🀄</p>
                <p className="text-lg font-medium mb-2">対局を始めよう</p>
                <p className="text-sm text-mahjong-muted mb-4">
                  メンバーを選んでセッションを開始
                </p>
                <Link href="/sessions/new">
                  <Button className="w-full" size="lg">
                    <Plus size={20} className="mr-2 inline" />
                    新規セッション作成
                  </Button>
                </Link>
              </div>
            </section>
          )}

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm text-mahjong-muted uppercase tracking-wider">
                  最近の対局
                </h2>
                <Link href="/history" className="text-xs text-mahjong-accent">
                  すべて見る
                </Link>
              </div>
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/history/${session.id}`}
                    className="block bg-mahjong-card rounded-xl p-4 transition-all hover:bg-mahjong-primary/40"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{session.date}</p>
                        <p className="text-xs text-mahjong-muted">
                          {session.members.map((m) => m.member.name).join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-mahjong-muted">
                          {session.hanchan.filter((h) => !h.isVoid).length}半荘
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
