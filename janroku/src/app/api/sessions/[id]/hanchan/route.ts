import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  sessions,
  sessionMembers,
  hanchan,
  hanchanScores,
  operationLogs,
} from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { generateId } from '@/lib/utils';
import { calculatePoints, validateScoreTotal } from '@/lib/mahjong/calculator';
import type { ScoreInput, PointInput } from '@/types';

// POST /api/sessions/[id]/hanchan - Create a new hanchan with scores
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Get session
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, params.id),
    });
    if (!session) {
      return NextResponse.json({ error: 'セッションが見つかりません' }, { status: 404 });
    }
    if (session.status !== 'active') {
      return NextResponse.json({ error: 'セッションは終了しています' }, { status: 400 });
    }

    // Get seat orders
    const members = await db
      .select()
      .from(sessionMembers)
      .where(eq(sessionMembers.sessionId, params.id));
    const seatOrders = new Map(members.map((m) => [m.memberId, m.seatOrder]));

    // Count existing hanchan to determine number
    const existingCount = await db
      .select({ count: count() })
      .from(hanchan)
      .where(eq(hanchan.sessionId, params.id));
    const hanchanNumber = (existingCount[0]?.count ?? 0) + 1;

    const now = new Date().toISOString();
    const hanchanId = generateId();

    if (inputMode === 'point' && points) {
      // Point input mode: points are directly entered, ranks auto-determined
      const sorted = [...points].sort((a, b) => {
        if (b.point !== a.point) return b.point - a.point;
        return (seatOrders.get(a.memberId) ?? 0) - (seatOrders.get(b.memberId) ?? 0);
      });

      await db.transaction(async (tx) => {
        await tx.insert(hanchan).values({
          id: hanchanId,
          sessionId: params.id,
          hanchanNumber,
          topMemberId: topMemberId || null,
          endedAt: now,
          isVoid: false,
          createdAt: now,
        });

        for (let i = 0; i < sorted.length; i++) {
          const p = sorted[i];
          await tx.insert(hanchanScores).values({
            id: generateId(),
            hanchanId,
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
          operationType: 'create_hanchan',
          payload: JSON.stringify({
            hanchanId,
            hanchanNumber,
            inputMode: 'point',
            points: sorted.map((p, i) => ({ ...p, rank: i + 1 })),
            topMemberId,
            chips,
          }),
          createdAt: now,
          clientTimestamp: now,
        });
      });
    } else if (scores) {
      // Raw score input mode (legacy)
      const validation = validateScoreTotal(scores, session.startingPoints);
      if (!validation.valid) {
        return NextResponse.json(
          { error: `合計点が不正です (合計: ${validation.total}, 期待値: ${validation.expected})` },
          { status: 400 }
        );
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
        await tx.insert(hanchan).values({
          id: hanchanId,
          sessionId: params.id,
          hanchanNumber,
          endedAt: now,
          isVoid: false,
          createdAt: now,
        });

        for (const cs of calculated) {
          await tx.insert(hanchanScores).values({
            id: generateId(),
            hanchanId,
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
          operationType: 'create_hanchan',
          payload: JSON.stringify({ hanchanId, hanchanNumber, inputMode: 'raw_score', scores: calculated, chips }),
          createdAt: now,
          clientTimestamp: now,
        });
      });
    } else {
      return NextResponse.json({ error: 'スコアデータが不足しています' }, { status: 400 });
    }

    // Return the created hanchan with scores
    const createdScores = await db.query.hanchanScores.findMany({
      where: eq(hanchanScores.hanchanId, hanchanId),
      with: { member: true },
    });

    return NextResponse.json(
      { id: hanchanId, hanchanNumber, scores: createdScores },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create hanchan:', error);
    return NextResponse.json({ error: '半荘の記録に失敗しました' }, { status: 500 });
  }
}
