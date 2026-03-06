'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Member } from '@/types';

interface SessionSummary {
  id: string;
  date: string;
  status: string;
  members: { memberId: string; member: Member }[];
  hanchan: { id: string; isVoid: boolean }[];
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      const data: SessionSummary[] = await res.json();
      setSessions(data.filter((s) => s.status === 'settled'));
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
      <h1 className="text-xl font-bold text-game-gold mb-6">セッション履歴</h1>

      {isLoading ? (
        <div className="text-center text-game-muted py-12">読み込み中...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center text-game-muted py-12">
          <p className="text-3xl mb-2">📋</p>
          <p>まだ履歴がありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/sessions/${session.id}`}
              className="block bg-felt-700 rounded-sm p-4 border border-felt-500/50 hover:bg-felt-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{session.date}</p>
                  <p className="text-xs text-game-muted">
                    {session.members.map((m) => m.member.name).join(', ')}
                  </p>
                </div>
                <p className="text-sm text-game-muted">
                  {session.hanchan.filter((h) => !h.isVoid).length}半荘
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
