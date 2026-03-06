'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ChevronLeft,
  Plus,
  Trash2,
  DollarSign,
  Trophy,
  Share2,
  UserPlus,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameWindow } from '@/components/ui/game-window';
import { ShareModal } from '@/components/session/share-modal';
import { formatPoints } from '@/lib/utils';
import type { Member } from '@/types';

const RANK_COLORS = ['text-game-gold', 'text-game-cyan', 'text-game-orange', 'text-game-red'];

interface HanchanScore {
  memberId: string;
  rawScore: number | null;
  rank: number;
  point: number;
  umaPoint: number | null;
  inputMode: string;
  chips: number | null;
  member: Member;
}

interface HanchanData {
  id: string;
  hanchanNumber: number;
  isVoid: boolean;
  scores: HanchanScore[];
}

interface SessionData {
  id: string;
  date: string;
  status: 'active' | 'settled' | 'cancelled';
  startingPoints: number;
  chipEnabled: boolean;
  chipValue: number;
  rateValue: number;
  members: { memberId: string; seatOrder: number; member: Member }[];
  hanchan: HanchanData[];
}

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      setSession(data);
    } catch (error) {
      console.error('Failed to fetch session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  if (isLoading || !session) {
    return <div className="p-4 text-center text-game-muted">読み込み中...</div>;
  }

  const activeHanchan = session.hanchan.filter((h) => !h.isVoid);
  const memberOrder = session.members.sort((a, b) => a.seatOrder - b.seatOrder);

  // Calculate totals per member
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

  // Sort members by total points for ranking
  const ranked = [...memberOrder].sort((a, b) => {
    const ta = totals.get(a.memberId)?.points ?? 0;
    const tb = totals.get(b.memberId)?.points ?? 0;
    return tb - ta;
  });

  const handleDeleteHanchan = async (hanchanId: string, hanchanNumber: number) => {
    if (!confirm(`半荘${hanchanNumber}を削除しますか？`)) return;
    try {
      await fetch(`/api/sessions/${sessionId}/hanchan/${hanchanId}`, {
        method: 'DELETE',
      });
      fetchSession();
    } catch (error) {
      console.error('Failed to delete hanchan:', error);
    }
  };

  const openAddMember = async () => {
    setShowAddMember(true);
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      setAllMembers(data);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const handleAddMember = async (memberId: string) => {
    setAddingMemberId(memberId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      if (res.ok) {
        await fetchSession();
        setShowAddMember(false);
      } else {
        const error = await res.json();
        alert(error.error || '追加に失敗しました');
      }
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setAddingMemberId(null);
    }
  };

  const handleCancelSession = async () => {
    if (!confirm('このセッションをキャンセルしますか？\n入力済みのデータはすべて無効になります。')) return;
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', endedAt: new Date().toISOString() }),
      });
      router.push('/');
    } catch (error) {
      console.error('Failed to cancel session:', error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-felt-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/')} className="p-2 -ml-2 text-game-muted hover:text-game-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-game-gold">対局中</h1>
            <p className="text-xs text-game-muted">{session.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.status === 'active' && (
            <button
              onClick={openAddMember}
              className="p-2 rounded-sm hover:bg-felt-700 transition-colors"
            >
              <UserPlus size={20} className="text-game-muted" />
            </button>
          )}
          {session.status === 'active' && (
            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 rounded-sm hover:bg-felt-700 transition-colors"
            >
              <Share2 size={20} className="text-game-muted" />
            </button>
          )}
          {session.status === 'active' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/sessions/${sessionId}/settlement`)}
            >
              <DollarSign size={16} className="mr-1 inline" />
              清算
            </Button>
          )}
        </div>
      </div>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        sessionId={sessionId}
      />

      {/* Ranking Summary */}
      <div className="px-4 pb-2">
        <GameWindow padding={false}>
          <div className="relative p-3">
            <div className="grid grid-cols-4 gap-2">
              {ranked.map((m, i) => {
                const t = totals.get(m.memberId);
                const points = t?.points ?? 0;
                const amount = Math.round(points * (session.rateValue || 100));
                const isFirst = i === 0;
                return (
                  <div key={m.memberId} className={`text-center ${isFirst ? 'relative' : ''}`}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {isFirst && <Trophy size={12} className="text-game-gold" />}
                      <span className={`text-xs ${RANK_COLORS[i] || 'text-game-muted'}`}>{i + 1}位</span>
                    </div>
                    <span className="text-sm">{m.member.avatarEmoji}</span>
                    <p className="text-xs font-medium truncate">{m.member.name}</p>
                    <p
                      className={`text-sm font-mono tabular-nums font-bold ${
                        points >= 0 ? 'text-game-green' : 'text-game-red'
                      }`}
                    >
                      {formatPoints(points)}
                    </p>
                    <p className="text-xs text-game-dim tabular-nums font-mono">
                      {amount >= 0 ? '+' : ''}¥{Math.abs(amount).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </GameWindow>
      </div>

      {/* Score Table */}
      <div className="flex-1 overflow-x-auto px-4">
        {activeHanchan.length === 0 ? (
          <div className="text-center text-game-muted py-12">
            <p className="text-3xl mb-2">📝</p>
            <p>まだ半荘がありません</p>
            <p className="text-sm">下のボタンからスコアを入力してください</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-game-muted text-xs border-b border-felt-500">
                <th className="py-2 text-left w-10">#</th>
                {memberOrder.map((m) => (
                  <th key={m.memberId} className="py-2 text-center">
                    <span className="text-base">{m.member.avatarEmoji}</span>
                    <br />
                    <span className="text-[10px]">{m.member.name}</span>
                  </th>
                ))}
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {activeHanchan.map((h) => (
                <tr
                  key={h.id}
                  onClick={() => {
                    if (session.status === 'active') {
                      router.push(`/sessions/${sessionId}/input?edit=${h.id}`);
                    }
                  }}
                  className={`border-b border-felt-500/50 hover:bg-felt-600/50 animate-slide-in-down ${
                    session.status === 'active' ? 'cursor-pointer' : ''
                  }`}
                >
                  <td className="py-2 text-game-cyan text-xs font-mono">{h.hanchanNumber}</td>
                  {memberOrder.map((m) => {
                    const score = h.scores.find((s) => s.memberId === m.memberId);
                    if (!score) return <td key={m.memberId} className="py-2 text-center text-game-dim">-</td>;
                    return (
                      <td key={m.memberId} className="py-2 text-center">
                        {score.rawScore !== null && (
                          <div className="font-mono tabular-nums text-xs text-game-white">
                            {(score.rawScore / 1000).toFixed(0)}
                          </div>
                        )}
                        <div
                          className={`text-[10px] font-mono tabular-nums ${
                            score.point >= 0
                              ? 'text-game-gold'
                              : 'text-game-red'
                          }`}
                        >
                          {formatPoints(score.point)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-2">
                    {session.status === 'active' && (
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHanchan(h.id, h.hanchanNumber);
                          }}
                          className="p-1.5 rounded-sm hover:bg-game-red/20"
                        >
                          <Trash2 size={14} className="text-game-red/60" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="font-bold border-t-2 border-frame-outer/50">
                <td className="py-3 text-game-muted text-xs">計</td>
                {memberOrder.map((m) => {
                  const t = totals.get(m.memberId);
                  return (
                    <td key={m.memberId} className="py-3 text-center">
                      <div
                        className={`font-mono tabular-nums text-sm ${
                          (t?.points ?? 0) >= 0
                            ? 'text-game-gold'
                            : 'text-game-red'
                        }`}
                      >
                        {formatPoints(t?.points ?? 0)}
                      </div>
                      {session.chipEnabled && (
                        <div className="text-[10px] text-game-orange font-mono">
                          chip:{t?.chips ?? 0}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Cancel Session */}
      {session.status === 'active' && (
        <div className="px-4 pb-4">
          <button
            onClick={handleCancelSession}
            className="w-full text-center text-xs text-game-dim py-2 hover:text-game-red transition-colors"
          >
            セッションをキャンセル
          </button>
        </div>
      )}

      {session.status === 'cancelled' && (
        <div className="px-4 pb-4">
          <div className="bg-game-red/10 text-game-red text-sm text-center py-3 rounded-sm border border-game-red/30">
            このセッションはキャンセルされました
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={() => setShowAddMember(false)}>
          <div
            className="game-window rounded-t-sm w-full max-w-lg p-0 max-h-[60vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="game-window-inner rounded-t-sm" />
            <div className="relative p-4">
              <h2 className="text-lg font-bold text-game-gold mb-4">メンバーを追加</h2>
              <div className="space-y-2">
                {allMembers
                  .filter((m) => !session.members.some((sm) => sm.memberId === m.id))
                  .map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleAddMember(m.id)}
                      disabled={addingMemberId === m.id}
                      className="w-full flex items-center justify-between p-3 rounded-sm bg-felt-700 hover:bg-felt-600 transition-colors disabled:opacity-50 border border-felt-500/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{m.avatarEmoji}</span>
                        <span className="font-medium">{m.name}</span>
                      </div>
                      <Plus size={18} className="text-game-green" />
                    </button>
                  ))}
                {allMembers.filter((m) => !session.members.some((sm) => sm.memberId === m.id)).length === 0 && (
                  <p className="text-center text-game-muted py-4">追加できるメンバーがいません</p>
                )}
              </div>
              <button
                onClick={() => setShowAddMember(false)}
                className="w-full text-center text-sm text-game-muted py-3 mt-2"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      {session.status === 'active' && (
        <div className="fixed bottom-24 right-4">
          <button
            onClick={() => router.push(`/sessions/${sessionId}/input`)}
            className="w-11 h-11 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform btn-primary"
          >
            <Plus size={22} />
          </button>
        </div>
      )}
    </div>
  );
}
