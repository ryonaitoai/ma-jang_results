'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_STARTING_POINTS,
  DEFAULT_RETURN_POINTS,
  DEFAULT_UMA,
  DEFAULT_RATE_VALUE,
  DEFAULT_CHIP_VALUE,
} from '@/lib/constants';
import type { Member } from '@/types';

export default function NewSessionPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rule settings
  const [startingPoints, setStartingPoints] = useState(DEFAULT_STARTING_POINTS);
  const [returnPoints, setReturnPoints] = useState(DEFAULT_RETURN_POINTS);
  const [umaFirst, setUmaFirst] = useState(DEFAULT_UMA.first);
  const [umaSecond, setUmaSecond] = useState(DEFAULT_UMA.second);
  const [umaThird, setUmaThird] = useState(DEFAULT_UMA.third);
  const [umaFourth, setUmaFourth] = useState(DEFAULT_UMA.fourth);
  const [chipEnabled, setChipEnabled] = useState(false);
  const [chipValue, setChipValue] = useState(DEFAULT_CHIP_VALUE);
  const [rateValue, setRateValue] = useState(DEFAULT_RATE_VALUE);
  const [showRules, setShowRules] = useState(false);

  const fetchMembers = useCallback(async () => {
    const res = await fetch('/api/members');
    const data = await res.json();
    setMembers(data);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length < 4 || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          memberIds: selectedIds,
          startingPoints,
          returnPoints,
          umaFirst,
          umaSecond,
          umaThird,
          umaFourth,
          chipEnabled,
          chipValue,
          rateValue,
        }),
      });
      const data = await res.json();
      router.push(`/sessions/${data.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-game-muted hover:text-game-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-game-gold">新規セッション</h1>
      </div>

      {/* Member Selection */}
      <section className="mb-6">
        <h2 className="text-sm text-game-muted mb-3 uppercase tracking-wider">
          参加メンバー ({selectedIds.length}/4+)
        </h2>
        <div className="space-y-2">
          {members.map((member) => {
            const isSelected = selectedIds.includes(member.id);
            return (
              <button
                key={member.id}
                onClick={() => toggleMember(member.id)}
                className={`w-full flex items-center justify-between p-4 rounded-sm transition-all ${
                  isSelected
                    ? 'bg-game-green/10 ring-2 ring-game-green'
                    : 'bg-felt-700 border border-felt-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{member.avatarEmoji}</span>
                  <span className="font-medium">{member.name}</span>
                </div>
                {isSelected && <Check size={20} className="text-game-green" />}
              </button>
            );
          })}
        </div>
        {members.length === 0 && (
          <p className="text-game-muted text-center py-8">
            先にメンバーを登録してください
          </p>
        )}
      </section>

      {/* Rule Settings (collapsible) */}
      <section className="mb-6">
        <button
          onClick={() => setShowRules(!showRules)}
          className="w-full text-left text-sm text-game-muted uppercase tracking-wider mb-3 flex items-center justify-between"
        >
          <span>ルール設定</span>
          <span className="text-xs">{showRules ? '閉じる' : '変更する'}</span>
        </button>

        {!showRules && (
          <div className="bg-felt-700 border border-felt-500/50 rounded-sm p-4 text-sm text-game-muted">
            持ち{(startingPoints / 1000).toFixed(0)}k / 返し{(returnPoints / 1000).toFixed(0)}k / ウマ{umaSecond}-{umaFirst} / {chipEnabled ? `チップ¥${chipValue}` : 'チップなし'}
          </div>
        )}

        {showRules && (
          <div className="bg-felt-700 border border-felt-500/50 rounded-sm p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-game-muted mb-1">持ち点</label>
                <input
                  type="number"
                  value={startingPoints}
                  onChange={(e) => setStartingPoints(Number(e.target.value))}
                  className="w-full bg-felt-900 rounded-sm px-3 py-2 text-right tabular-nums font-mono text-game-white"
                />
              </div>
              <div>
                <label className="block text-xs text-game-muted mb-1">返し点</label>
                <input
                  type="number"
                  value={returnPoints}
                  onChange={(e) => setReturnPoints(Number(e.target.value))}
                  className="w-full bg-felt-900 rounded-sm px-3 py-2 text-right tabular-nums font-mono text-game-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-game-muted mb-1">ウマ</label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { label: '1着', value: umaFirst, setter: setUmaFirst as (v: number) => void },
                  { label: '2着', value: umaSecond, setter: setUmaSecond as (v: number) => void },
                  { label: '3着', value: umaThird, setter: setUmaThird as (v: number) => void },
                  { label: '4着', value: umaFourth, setter: setUmaFourth as (v: number) => void },
                ] as const).map(({ label, value, setter }) => (
                  <div key={label}>
                    <span className="text-xs text-game-muted">{label}</span>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setter(Number(e.target.value))}
                      className="w-full bg-felt-900 rounded-sm px-2 py-2 text-right tabular-nums font-mono text-sm text-game-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm">チップ</label>
              <button
                onClick={() => setChipEnabled(!chipEnabled)}
                className={`w-12 h-7 rounded-full transition-colors ${
                  chipEnabled ? 'bg-game-green' : 'bg-felt-900'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform mx-1 ${
                    chipEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {chipEnabled && (
              <div>
                <label className="block text-xs text-game-muted mb-1">チップ単価 (円)</label>
                <input
                  type="number"
                  value={chipValue}
                  onChange={(e) => setChipValue(Number(e.target.value))}
                  className="w-full bg-felt-900 rounded-sm px-3 py-2 text-right tabular-nums font-mono text-game-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-game-muted mb-1">レート (1pt = ¥)</label>
              <input
                type="number"
                value={rateValue}
                onChange={(e) => setRateValue(Number(e.target.value))}
                className="w-full bg-felt-900 rounded-sm px-3 py-2 text-right tabular-nums font-mono text-game-white"
              />
            </div>
          </div>
        )}
      </section>

      <Button
        onClick={handleSubmit}
        disabled={selectedIds.length < 4 || isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? '作成中...' : 'セッション開始'}
      </Button>
    </div>
  );
}
