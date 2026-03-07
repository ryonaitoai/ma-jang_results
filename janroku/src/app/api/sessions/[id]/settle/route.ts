import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  sessions,
  sessionMembers,
  hanchan,
  hanchanScores,
  settlements,
  settlementTransfers,
  operationLogs,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/utils';
import { calculateSettlementTransfers } from '@/lib/mahjong/settlement';

// POST /api/sessions/[id]/settle - Settle the session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const chipCounts: Record<string, number> = body.chipCounts || {};
    const chipPointValue: number = body.chipPointValue || 0;

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, params.id),
    });

    if (!session) {
      return NextResponse.json({ error: 'セッションが見つかりません' }, { status: 404 });
    }

    if (session.status === 'settled') {
      return NextResponse.json({ error: 'すでに清算済みです' }, { status: 400 });
    }

    // Get members
    const members = await db.query.sessionMembers.findMany({
      where: eq(sessionMembers.sessionId, params.id),
      with: { member: true },
    });

    // Get active hanchan
    const allHanchan = await db
      .select()
      .from(hanchan)
      .where(eq(hanchan.sessionId, params.id));
    const activeHanchan = allHanchan.filter((h) => !h.isVoid);

    // Calculate totals per member
    const rateValue = session.rateValue || 100;
    const memberResults: {
      memberId: string;
      memberName: string;
      totalPoint: number;
      totalChips: number;
    }[] = [];

    for (const sm of members) {
      let totalPoint = 0;

      for (const h of activeHanchan) {
        const scores = await db
          .select()
          .from(hanchanScores)
          .where(eq(hanchanScores.hanchanId, h.id));

        const memberScore = scores.find((s) => s.memberId === sm.memberId);
        if (memberScore) {
          totalPoint += memberScore.point;
        }
      }

      const chips = chipCounts[sm.memberId] || 0;

      memberResults.push({
        memberId: sm.memberId,
        memberName: sm.member.name,
        totalPoint: Math.round(totalPoint * 10) / 10,
        totalChips: chips,
      });
    }

    // Calculate settlement amounts (point amount + chip amount)
    const balances = memberResults.map((mr) => {
      const pointAmount = Math.round(mr.totalPoint * rateValue);
      const chipAmount = mr.totalChips * chipPointValue * rateValue;
      return {
        memberId: mr.memberId,
        memberName: mr.memberName,
        amount: pointAmount + chipAmount,
      };
    });

    // Calculate optimized transfers
    const transfers = calculateSettlementTransfers(balances);

    const now = new Date().toISOString();

    const result = await db.transaction(async (tx) => {
      // Optimistic lock: atomically update status only if still 'active'
      const updated = await tx
        .update(sessions)
        .set({ status: 'settled', endedAt: now })
        .where(and(eq(sessions.id, params.id), eq(sessions.status, 'active')));

      if (updated.rowsAffected === 0) {
        throw new Error('ALREADY_SETTLED');
      }

      // Clear any partial data from a previous failed attempt (idempotency)
      await tx.delete(settlements).where(eq(settlements.sessionId, params.id));
      await tx.delete(settlementTransfers).where(eq(settlementTransfers.sessionId, params.id));

      // Save settlements
      for (const mr of memberResults) {
        const balance = balances.find((b) => b.memberId === mr.memberId);
        await tx.insert(settlements).values({
          id: generateId(),
          sessionId: params.id,
          memberId: mr.memberId,
          totalPoint: mr.totalPoint,
          totalChips: mr.totalChips,
          totalAmount: balance?.amount ?? 0,
          createdAt: now,
        });
      }

      // Save transfers
      for (const t of transfers) {
        await tx.insert(settlementTransfers).values({
          id: generateId(),
          sessionId: params.id,
          fromMemberId: t.fromMemberId,
          toMemberId: t.toMemberId,
          amount: t.amount,
          createdAt: now,
        });
      }

      // Log operation
      await tx.insert(operationLogs).values({
        id: generateId(),
        sessionId: params.id,
        operationType: 'settle',
        payload: JSON.stringify({ settlements: memberResults, transfers }),
        createdAt: now,
        clientTimestamp: now,
      });

      return {
        settlements: memberResults.map((mr) => ({
          ...mr,
          totalAmount: balances.find((b) => b.memberId === mr.memberId)?.amount ?? 0,
        })),
        transfers,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_SETTLED') {
      return NextResponse.json({ error: 'すでに清算済みです' }, { status: 409 });
    }
    console.error('Failed to settle session:', error);
    return NextResponse.json({ error: '清算に失敗しました' }, { status: 500 });
  }
}
