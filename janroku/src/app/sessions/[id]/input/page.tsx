'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ChevronLeft, Check, Crown, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { Numpad } from '@/components/score/numpad';
import { Button } from '@/components/ui/button';
import type { Member } from '@/types';

interface SessionMemberData {
  memberId: string;
  seatOrder: number;
  member: Member;
}

interface HanchanData {
  id: string;
  topMemberId: string | null;
  scores: {
    memberId: string;
    rawScore: number | null;
    point: number;
    umaPoint: number | null;
    inputMode: string;
    isAutoCalculated: boolean;
    chips: number | null;
  }[];
}

interface SessionData {
  id: string;
  startingPoints: number;
  returnPoints: number;
  chipEnabled: boolean;
  members: SessionMemberData[];
  hanchan: HanchanData[];
}

type InputMode = 'point' | 'raw_score';
type Step = 'select_top' | 'input';

export default function ScoreInputPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const editHanchanId = searchParams.get('edit');

  const [session, setSession] = useState<SessionData | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('point');
  const [step, setStep] = useState<Step>('select_top');
  const [topMemberId, setTopMemberId] = useState<string>('');
  const [pointInputs, setPointInputs] = useState<Record<string, string>>({});
  const [chipInputs, setChipInputs] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string>('');
  const [activeType, setActiveType] = useState<'point' | 'chip'>('point');
  const [topManual, setTopManual] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Raw score mode state
  const [rawScoreInputs, setRawScoreInputs] = useState<Record<string, string>>({});

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data: SessionData = await res.json();
      setSession(data);

      const initialChips: Record<string, string> = {};
      data.members.forEach((m) => {
        initialChips[m.memberId] = '0';
      });
      setChipInputs(initialChips);

      // If editing, pre-fill
      if (editHanchanId && data.hanchan) {
        const editHanchan = data.hanchan.find((h) => h.id === editHanchanId);
        if (editHanchan) {
          const mode = editHanchan.scores[0]?.inputMode || 'point';
          setInputMode(mode as InputMode);

          if (mode === 'point') {
            const top = editHanchan.topMemberId || editHanchan.scores.find((s) => s.isAutoCalculated)?.memberId || '';
            setTopMemberId(top);
            setStep('input');

            const pts: Record<string, string> = {};
            for (const s of editHanchan.scores) {
              if (s.memberId !== top) {
                pts[s.memberId] = String(s.point);
              }
            }
            setPointInputs(pts);
          } else {
            setStep('input');
            const raw: Record<string, string> = {};
            for (const s of editHanchan.scores) {
              if (s.rawScore !== null) {
                raw[s.memberId] = String(s.rawScore / 1000);
              }
            }
            setRawScoreInputs(raw);
            if (data.members.length > 0) {
              setActiveField(data.members[0].memberId);
            }
          }

          for (const s of editHanchan.scores) {
            if (s.chips !== null) {
              initialChips[s.memberId] = String(s.chips);
            }
          }
          setChipInputs({ ...initialChips });
        }
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, editHanchanId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  if (isLoading || !session) {
    return <div className="p-3 text-center text-game-muted">読み込み中...</div>;
  }

  const members = session.members.sort((a, b) => a.seatOrder - b.seatOrder);
  const nonTopMembers = members.filter((m) => m.memberId !== topMemberId);

  // ─── Point input mode helpers ───
  const parsePoint = (input: string): number => {
    if (!input || input === '' || input === '-') return 0;
    return parseFloat(input) || 0;
  };

  // Members who have actual score values (not just '-' or empty)
  const filledNonTopMembers = nonTopMembers.filter((m) => {
    const v = pointInputs[m.memberId];
    return v !== undefined && v !== '' && v !== '-';
  });

  const filledNonTopTotal = filledNonTopMembers.reduce(
    (sum, m) => sum + parsePoint(pointInputs[m.memberId] || ''),
    0
  );
  const topAutoValue = Math.round(-filledNonTopTotal * 10) / 10;

  // Valid when at least 3 non-top members have scores (4-player mahjong)
  const pointModeValid = topManual
    ? (() => {
        const manualTop = parsePoint(pointInputs[topMemberId] || '');
        const total = filledNonTopTotal + manualTop;
        return Math.abs(total) < 0.01 && filledNonTopMembers.length >= 3 && pointInputs[topMemberId] !== '' && pointInputs[topMemberId] !== '-';
      })()
    : filledNonTopMembers.length >= 3;
  const allNonTopFilled = filledNonTopMembers.length >= 3;

  // ─── Raw score mode helpers ───
  const parseRawScore = (input: string): number => {
    if (!input || input === '' || input === '-') return 0;
    return Math.round(parseFloat(input) * 1000);
  };

  const rawTotal = members.reduce(
    (sum, m) => sum + parseRawScore(rawScoreInputs[m.memberId] || ''),
    0
  );
  const rawExpected = session.startingPoints * 4;
  const rawValid = rawTotal === rawExpected && members.every((m) => {
    const v = rawScoreInputs[m.memberId];
    return v !== undefined && v !== '' && v !== '-';
  });

  // ─── Sign toggle for a specific member ───
  const toggleSign = (memberId: string) => {
    const setter = inputMode === 'point' ? setPointInputs : setRawScoreInputs;
    setter((prev) => {
      const current = prev[memberId] || '';
      if (!current || current === '-') return prev;
      if (current.startsWith('-')) {
        return { ...prev, [memberId]: current.slice(1) };
      }
      return { ...prev, [memberId]: '-' + current };
    });
  };

  // ─── Numpad handlers ───
  const handleNumInput = (digit: string) => {
    if (inputMode === 'point' && activeType === 'point') {
      setPointInputs((prev) => {
        const current = prev[activeField] || '';
        const stripped = current.replace('-', '');
        if (digit === '.' && stripped.includes('.')) return prev;
        if (stripped.length >= 6) return prev;
        const isNeg = current.startsWith('-');
        return { ...prev, [activeField]: (isNeg ? '-' : '') + stripped + digit };
      });
    } else if (inputMode === 'raw_score' && activeType === 'point') {
      setRawScoreInputs((prev) => {
        const current = prev[activeField] || '';
        const stripped = current.replace('-', '');
        if (stripped.length >= 5) return prev;
        const isNeg = current.startsWith('-');
        return { ...prev, [activeField]: (isNeg ? '-' : '') + stripped + digit };
      });
    } else {
      // chip
      setChipInputs((prev) => {
        const current = prev[activeField] || '';
        if (current.length >= 3) return prev;
        return { ...prev, [activeField]: current === '0' ? digit : current + digit };
      });
    }
  };

  const handleDelete = () => {
    if (activeType === 'chip') {
      setChipInputs((prev) => {
        const newVal = (prev[activeField] || '').slice(0, -1);
        return { ...prev, [activeField]: newVal || '0' };
      });
      return;
    }
    const setter = inputMode === 'point' ? setPointInputs : setRawScoreInputs;
    setter((prev) => ({
      ...prev,
      [activeField]: (prev[activeField] || '').slice(0, -1),
    }));
  };

  const handleClear = () => {
    if (activeType === 'chip') {
      setChipInputs((prev) => ({ ...prev, [activeField]: '0' }));
      return;
    }
    const setter = inputMode === 'point' ? setPointInputs : setRawScoreInputs;
    setter((prev) => ({ ...prev, [activeField]: '' }));
  };

  // ─── Top selection ───
  const handleSelectTop = (memberId: string) => {
    setTopMemberId(memberId);
    setStep('input');
    // Initialize point inputs with minus sign for non-top members
    const pts: Record<string, string> = {};
    members.forEach((m) => {
      if (m.memberId !== memberId) {
        pts[m.memberId] = '-';
      }
    });
    setPointInputs(pts);
    // Set first non-top member as active
    const firstNonTop = members.find((m) => m.memberId !== memberId);
    if (firstNonTop) {
      setActiveField(firstNonTop.memberId);
    }
  };

  // ─── Submit ───
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const chips: Record<string, number> = {};
      if (session.chipEnabled) {
        members.forEach((m) => {
          chips[m.memberId] = parseInt(chipInputs[m.memberId] || '0', 10);
        });
      }

      const url = editHanchanId
        ? `/api/sessions/${sessionId}/hanchan/${editHanchanId}`
        : `/api/sessions/${sessionId}/hanchan`;
      const method = editHanchanId ? 'PUT' : 'POST';

      let requestBody: Record<string, unknown>;

      if (inputMode === 'point') {
        // Only include top + filled non-top members (exclude sitting-out members)
        const playingMembers = [
          topMemberId,
          ...filledNonTopMembers.map((m) => m.memberId),
        ];
        const points = playingMembers.map((memberId) => {
          const isTop = memberId === topMemberId && !topManual;
          const point = isTop ? topAutoValue : parsePoint(pointInputs[memberId] || '');
          return {
            memberId,
            point: Math.round(point * 10) / 10,
            isAutoCalculated: isTop,
          };
        });
        requestBody = {
          inputMode: 'point',
          points,
          topMemberId,
          chips: session.chipEnabled ? chips : undefined,
        };
      } else {
        const scores = members.map((m) => ({
          memberId: m.memberId,
          rawScore: parseRawScore(rawScoreInputs[m.memberId] || ''),
        }));
        requestBody = {
          inputMode: 'raw_score',
          scores,
          chips: session.chipEnabled ? chips : undefined,
        };
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || 'エラーが発生しました');
        setIsSubmitting(false);
        return;
      }

      router.push(`/sessions/${sessionId}`);
    } catch (error) {
      console.error('Failed to save scores:', error);
      setIsSubmitting(false);
    }
  };

  // ─── Render: Top Selection Step ───
  if (step === 'select_top' && inputMode === 'point') {
    return (
      <div className="flex flex-col h-screen bg-felt-800">
        <div className="flex items-center justify-between p-3 pb-1">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="p-1 -ml-1 text-game-muted hover:text-game-white">
              <ChevronLeft size={22} />
            </button>
            <h1 className="text-base font-bold text-game-gold">
              {editHanchanId ? 'スコア修正' : 'スコア入力'}
            </h1>
          </div>
          <button
            onClick={() => {
              setInputMode('raw_score');
              setStep('input');
              const raw: Record<string, string> = {};
              members.forEach((m) => { raw[m.memberId] = ''; });
              setRawScoreInputs(raw);
              if (members.length > 0) setActiveField(members[0].memberId);
            }}
            className="text-xs text-game-muted flex items-center gap-1"
          >
            <ArrowLeftRight size={14} />
            素点入力
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Crown size={32} className="text-game-gold mb-3" />
          <h2 className="text-lg font-bold mb-1">トップは誰？</h2>
          <p className="text-xs text-game-muted mb-6">1着のメンバーを選択</p>

          <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
            {members.map((m) => (
              <button
                key={m.memberId}
                onClick={() => handleSelectTop(m.memberId)}
                className="flex flex-col items-center gap-1.5 bg-felt-700 border border-felt-500/50 rounded-sm p-4 active:scale-95 transition-all hover:bg-felt-600"
              >
                <span className="text-2xl">{m.member.avatarEmoji}</span>
                <span className="font-medium text-sm">{m.member.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Input Step ───
  const isValid = inputMode === 'point' ? pointModeValid : rawValid;

  return (
    <div className="bg-felt-800 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (inputMode === 'point' && step === 'input' && !editHanchanId) {
                setStep('select_top');
                setTopMemberId('');
                setPointInputs({});
                setTopManual(false);
              } else {
                router.back();
              }
            }}
            className="p-1 -ml-1 text-game-muted hover:text-game-white"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-base font-bold text-game-gold">
            {editHanchanId ? 'スコア修正' : 'スコア入力'}
          </h1>
        </div>
        <button
          onClick={() => {
            if (inputMode === 'point') {
              setInputMode('raw_score');
              const raw: Record<string, string> = {};
              members.forEach((m) => { raw[m.memberId] = ''; });
              setRawScoreInputs(raw);
              if (members.length > 0) setActiveField(members[0].memberId);
            } else {
              setInputMode('point');
              setStep('select_top');
              setTopMemberId('');
              setPointInputs({});
              setTopManual(false);
            }
          }}
          className="text-xs text-game-muted flex items-center gap-1"
        >
          <ArrowLeftRight size={14} />
          {inputMode === 'point' ? '素点入力' : 'ポイント入力'}
        </button>
      </div>

      {/* Point Input Mode */}
      {inputMode === 'point' && (
        <>
          {/* Sum check */}
          <div className="px-3 pb-1">
            <div className={`text-center text-xs font-mono py-0.5 rounded-sm ${
              isValid
                ? 'bg-game-green/20 text-game-green'
                : 'bg-felt-700 text-game-muted'
            }`}>
              合計: {topManual
                ? (filledNonTopTotal + parsePoint(pointInputs[topMemberId] || '')).toFixed(1)
                : '0.0'
              } {isValid ? '✓' : ''} ({filledNonTopMembers.length + 1}/4人)
            </div>
          </div>

          {/* Score fields */}
          <div className="px-3 space-y-1.5">
            {/* Top member (auto-calculated) */}
            {topMemberId && (() => {
              const topMember = members.find((m) => m.memberId === topMemberId);
              if (!topMember) return null;
              const isTopActive = activeField === topMemberId && activeType === 'point' && topManual;

              return (
                <div>
                  <div
                    onClick={() => {
                      if (topManual) {
                        setActiveField(topMemberId);
                        setActiveType('point');
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded-sm transition-all ${
                      isTopActive
                        ? 'bg-game-gold/20 ring-2 ring-game-gold'
                        : topManual
                          ? 'bg-felt-700'
                          : 'bg-felt-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Crown size={14} className="text-game-gold" />
                      <span className="text-base">{topMember.member.avatarEmoji}</span>
                      <span className="font-medium text-sm">{topMember.member.name}</span>
                      <span className="text-[10px] text-game-gold">TOP</span>
                    </div>
                    <div className="text-right">
                      {topManual ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isTopActive) {
                              toggleSign(topMemberId);
                            } else {
                              setActiveField(topMemberId);
                              setActiveType('point');
                            }
                          }}
                          className={`text-lg font-mono tabular-nums font-bold cursor-pointer ${
                            parsePoint(pointInputs[topMemberId] || '') >= 0 ? 'text-game-gold' : 'text-game-red'
                          }`}
                        >
                          {pointInputs[topMemberId] || '___'}
                        </span>
                      ) : (
                        <span className={`text-lg font-mono tabular-nums font-bold ${
                          allNonTopFilled
                            ? topAutoValue >= 0
                              ? 'text-game-gold'
                              : 'text-game-orange'
                            : 'text-game-muted'
                        }`}>
                          {(topAutoValue >= 0 ? '+' : '') + topAutoValue.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-1 mt-0.5">
                    <span className="text-[10px] text-game-muted">
                      {topManual ? '手動入力中' : '自動算出'}
                    </span>
                    <button
                      onClick={() => {
                        setTopManual(!topManual);
                        if (!topManual) {
                          setActiveField(topMemberId);
                          setActiveType('point');
                          setPointInputs((prev) => ({ ...prev, [topMemberId]: '' }));
                        } else {
                          const { [topMemberId]: _, ...rest } = pointInputs;
                          setPointInputs(rest);
                        }
                      }}
                      className="text-[10px] text-game-green"
                    >
                      {topManual ? '自動に戻す' : '手動入力'}
                    </button>
                  </div>

                  {/* Warnings */}
                  {!topManual && allNonTopFilled && topAutoValue < 0 && (
                    <div className="flex items-center gap-1 px-1 text-[10px] text-game-orange">
                      <AlertTriangle size={10} />
                      トップがマイナス（要確認）
                    </div>
                  )}
                  {!topManual && allNonTopFilled && Math.abs(topAutoValue) >= 100 && (
                    <div className="flex items-center gap-1 px-1 text-[10px] text-game-orange">
                      <AlertTriangle size={10} />
                      極端に大きい値（要確認）
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Non-top members (input fields) */}
            {nonTopMembers.map((m) => {
              const isActive = activeField === m.memberId && activeType === 'point';
              const rawValue = pointInputs[m.memberId] || '';
              const pointValue = parsePoint(rawValue);

              return (
                <div key={m.memberId}>
                  <div
                    className={`flex items-center justify-between rounded-sm transition-all ${
                      isActive
                        ? pointValue >= 0 && rawValue && rawValue !== '-'
                          ? 'bg-game-green/10 ring-2 ring-game-green'
                          : 'bg-game-red/10 ring-2 ring-game-red/50'
                        : 'bg-felt-700'
                    }`}
                  >
                    {/* Left: tap to select field */}
                    <div
                      onClick={() => {
                        setActiveField(m.memberId);
                        setActiveType('point');
                      }}
                      className="flex items-center gap-1.5 p-2 flex-1 min-w-0"
                    >
                      <span className="text-base">{m.member.avatarEmoji}</span>
                      <span className="font-medium text-sm truncate">{m.member.name}</span>
                    </div>
                    {/* Right: tap to toggle sign (when active + has value) */}
                    <div
                      onClick={() => {
                        if (isActive && rawValue && rawValue !== '-') {
                          toggleSign(m.memberId);
                        } else {
                          setActiveField(m.memberId);
                          setActiveType('point');
                        }
                      }}
                      className="px-3 py-2 cursor-pointer select-none"
                    >
                      <span className={`text-lg font-mono tabular-nums font-bold ${
                        rawValue && rawValue !== '-'
                          ? pointValue >= 0
                            ? 'text-game-gold'
                            : 'text-game-red'
                          : 'text-game-muted'
                      }`}>
                        {rawValue || '___'}
                      </span>
                    </div>
                  </div>

                  {session.chipEnabled && (
                    <button
                      onClick={() => {
                        setActiveField(m.memberId);
                        setActiveType('chip');
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded-sm text-xs transition-all mt-0.5 ${
                        activeField === m.memberId && activeType === 'chip'
                          ? 'bg-game-orange/20 ring-1 ring-game-orange'
                          : 'bg-felt-900'
                      }`}
                    >
                      <span className="text-game-muted">チップ</span>
                      <span className="font-mono tabular-nums">{chipInputs[m.memberId] || '0'}枚</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Raw Score Input Mode */}
      {inputMode === 'raw_score' && (
        <>
          <div className="px-3 pb-1">
            <div className={`text-center text-xs font-mono py-0.5 rounded-sm ${
              rawValid
                ? 'bg-game-green/20 text-game-green'
                : rawTotal === 0
                  ? 'bg-felt-700 text-game-muted'
                  : 'bg-game-red/10 text-game-red'
            }`}>
              合計: {rawTotal.toLocaleString()} / {rawExpected.toLocaleString()}
              {rawTotal !== rawExpected && rawTotal !== 0 && ` (${rawTotal > rawExpected ? '+' : ''}${(rawTotal - rawExpected).toLocaleString()})`}
            </div>
          </div>

          <div className="px-3 space-y-1.5">
            {members.map((m) => {
              const isActive = activeField === m.memberId && activeType === 'point';
              const rawValue = rawScoreInputs[m.memberId] || '';
              const displayScore = rawValue && rawValue !== '-' ? `${parseRawScore(rawValue).toLocaleString()}点` : '';

              return (
                <div key={m.memberId}>
                  <div
                    onClick={() => { setActiveField(m.memberId); setActiveType('point'); }}
                    className={`flex items-center justify-between p-2 rounded-sm transition-all ${
                      isActive ? 'bg-game-green/10 ring-2 ring-game-green' : 'bg-felt-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{m.member.avatarEmoji}</span>
                      <span className="font-medium text-sm">{m.member.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-mono tabular-nums">{rawValue || '___'}</span>
                      <span className="text-[10px] text-game-muted ml-1">{displayScore}</span>
                    </div>
                  </div>

                  {session.chipEnabled && (
                    <button
                      onClick={() => { setActiveField(m.memberId); setActiveType('chip'); }}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded-sm text-xs transition-all mt-0.5 ${
                        activeField === m.memberId && activeType === 'chip'
                          ? 'bg-game-orange/20 ring-1 ring-game-orange'
                          : 'bg-felt-900'
                      }`}
                    >
                      <span className="text-game-muted">チップ</span>
                      <span className="font-mono tabular-nums">{chipInputs[m.memberId] || '0'}枚</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Numpad and Submit */}
      <div className="p-3 pt-1.5 space-y-1.5 bg-felt-800">
        <Numpad
          onInput={handleNumInput}
          onDelete={handleDelete}
          onClear={handleClear}
          showDecimal={inputMode === 'point'}
        />
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? '保存中...' : isValid ? (
            <span className="flex items-center justify-center gap-1">
              <Check size={18} />
              確定
            </span>
          ) : inputMode === 'point' ? `あと${3 - filledNonTopMembers.length}人のポイントを入力` : '合計が一致していません'}
        </Button>
      </div>
    </div>
  );
}
