'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, ChevronRight, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameWindow } from '@/components/ui/game-window';
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
        <Image
          src="/janroku-logo-v2.png"
          alt="雀録 - セットマージャン成績管理"
          width={160}
          height={48}
          priority
          className="h-[50px] w-auto"
          style={{ imageRendering: 'pixelated' }}
        />
        <Link href="/sessions/new">
          <Button size="sm">
            <Plus size={18} className="mr-1 inline" />
            新規対局
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center text-game-muted py-12">読み込み中...</div>
      ) : (
        <>
          {/* Active Sessions */}
          {activeSessions.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm text-game-muted mb-3 uppercase tracking-wider">
                進行中のセッション
              </h2>
              <div className="space-y-2">
                {activeSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="block border border-game-green/30 bg-game-green/5 rounded-sm p-4 transition-all hover:bg-game-green/10"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Gamepad2 size={20} className="text-game-green animate-blink" />
                        <div>
                          <p className="font-medium">{session.date}</p>
                          <p className="text-xs text-game-muted">
                            {session.members.map((m) => m.member.name).join(', ')} ・{' '}
                            {session.hanchan.filter((h) => !h.isVoid).length}半荘
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-game-muted" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Quick Start */}
          {activeSessions.length === 0 && (
            <section className="mb-6">
              <GameWindow>
                <div className="text-center">
                  <p className="text-4xl mb-3">🀄</p>
                  <p className="text-lg font-bold mb-2">対局を始めよう</p>
                  <p className="text-sm text-game-muted mb-4">
                    メンバーを選んでセッションを開始
                  </p>
                  <Link href="/sessions/new">
                    <Button className="w-full" size="lg">
                      <Plus size={20} className="mr-2 inline" />
                      新規セッション作成
                    </Button>
                  </Link>
                </div>
              </GameWindow>
            </section>
          )}

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm text-game-muted uppercase tracking-wider">
                  最近の対局
                </h2>
                <Link href="/history" className="text-xs text-game-green">
                  すべて見る
                </Link>
              </div>
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="block bg-felt-700 rounded-sm p-4 transition-all hover:bg-felt-600 border border-felt-500/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{session.date}</p>
                        <p className="text-xs text-game-muted">
                          {session.members.map((m) => m.member.name).join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-game-muted">
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
