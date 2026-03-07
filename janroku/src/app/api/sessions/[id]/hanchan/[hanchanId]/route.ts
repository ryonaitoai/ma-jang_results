import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  sessions,
  sessionMembers,
  hanchan,
  hanchanScores,
  operationLogs,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/utils';
import { calculatePoints, validateScoreTotal } from '@/lib/mahjong/calculator';
import type { ScoreInput, PointInput } from '@/types';

// PUT /api/sessions/[id]/hanchan/[hanchanId] - Update scores
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; hanchanId: string } }
) {
  try {
    const body = await request.json();
    const {
      inputMode = 'point',
      scores,
      points,
      chips,
      topMemberId,
    } = body as {
      inputMode: 'point' | 'raw_score';
      scores?: ScoreInput[];
      points?: PointInput[];
      chips?: Record<string, number>;
      topMemberId?: string;
    };

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, params.id),
    });
    if (!session) {
      return NextResponse.json({ error: 'セッションが見つかりません' }, { status: 404 });
    }
    if (session.status !== 'active') {
      return NextResponse.json({ error: 'セッションは終了しています' }, { status: 400 });
    }

    const members = await db
      .select()
      .from(sessionMembers)
      .where(eq(sessionMembers.sessionId, params.id));
    const seatOrders = new Map(members.map((m) => [m.memberId, m.seatOrder]));

    const now = new Date().toISOString();

    if (inputMode === 'point' && points) {
      const sorted = [...points].sort((a, b) => {
        if (b.point !== a.point) return b.point - a.point;
        return (seatOrders.get(a.memberId) ?? 0) - (seatOrders.get(b.memberId) ?? 0);
      });

      await db.transaction(async (tx) => {
        await tx.delete(hanchanScores).where(eq(hanchanScores.hanchanId, params.hanchanId));
        await tx.update(hanchan).set({ topMemberId: topMemberId || null }).where(eq(hanchan.id, params.hanchanId));

        for (let i = 0; i < sorted.length; i++) {
          const p = sorted[i];
          await tx.insert(hanchanScores).values({
            id: generateId(),
            hanchanId: params.hanchanId,
            memberId: p.memberId,
            rawScore: null,
            rank: i + 1,
            point: p.point,
            umaPoint: p.point,
            inputMode: 'point',
            isAutoCalculated: p.isAutoCalculated,
            chips: chips?.[p.memberId] ?? null,
            createdAt: now,
          });
        }

        await tx.insert(operationLogs).values({
          id: generateId(),
          sessionId: params.id,
          operationType: 'update_score',
          payload: JSON.stringify({ hanchanId: params.hanchanId, inputMode, points, scores, chips }),
          createdAt: now,
          clientTimestamp: now,
        });
      });
    } else if (scores) {
      const validation = validateScoreTotal(scores, session.startingPoints);
      if (!validation.valid) {
        return NextResponse.json({ error: '合計点が不正です' }, { status: 400 });
      }

      const calculated = calculatePoints(scores, seatOrders, {
        startingPoints: session.startingPoints,
        returnPoints: session.returnPoints,
        umaFirst: session.umaFirst,
        umaSecond: session.umaSecond,
        umaThird: session.umaThird,
        umaFourth: session.umaFourth,
      });

      await db.transaction(async (tx) => {
        await tx.delete(hanchanScores).where(eq(hanchanScores.hanchanId, params.hanchanId));

        for (const cs of calculated) {
          await tx.insert(hanchanScores).values({
            id: generateId(),
            hanchanId: params.hanchanId,
            memberId: cs.memberId,
            rawScore: cs.rawScore,
            rank: cs.rank,
            point: cs.umaPoint,
            umaPoint: cs.umaPoint,
            inputMode: 'raw_score',
            isAutoCalculated: false,
            chips: chips?.[cs.memberId] ?? null,
            createdAt: now,
          });
        }

        await tx.insert(operationLogs).values({
          id: generateId(),
          sessionId: params.id,
          operationType: 'update_score',
          payload: JSON.stringify({ hanchanId: params.hanchanId, inputMode, points, scores, chips }),
          createdAt: now,
          clientTimestamp: now,
        });
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update hanchan:', error);
    return NextResponse.json({ error: 'スコアの更新に失敗しました' }, { status: 500 });
  }
}

// DELETE /api/sessions/[id]/hanchan/[hanchanId] - Void a hanchan (logical delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; hanchanId: string } }
) {
  try {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, params.id),
    });
    if (!session) {
      return NextResponse.json({ error: 'セッションが見つかりません' }, { status: 404 });
    }
    if (session.status !== 'active') {
      return NextResponse.json({ error: 'セッションは終了しています' }, { status: 400 });
    }

    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      await tx
        .update(hanchan)
        .set({ isVoid: true })
        .where(eq(hanchan.id, params.hanchanId));

      await tx.insert(operationLogs).values({
        id: generateId(),
        sessionId: params.id,
        operationType: 'delete_hanchan',
        payload: JSON.stringify({ hanchanId: params.hanchanId }),
        createdAt: now,
        clientTimestamp: now,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to void hanchan:', error);
    return NextResponse.json({ error: '半荘の無効化に失敗しました' }, { status: 500 });
  }
}
