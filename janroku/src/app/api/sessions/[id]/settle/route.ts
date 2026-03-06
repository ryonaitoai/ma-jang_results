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
import { eq } from 'drizzle-orm';
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

    // Save settlements
    for (const mr of memberResults) {
      const balance = balances.find((b) => b.memberId === mr.memberId);
      await db.insert(settlements).values({
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
      await db.insert(settlementTransfers).values({
        id: generateId(),
        sessionId: params.id,
        fromMemberId: t.fromMemberId,
        toMemberId: t.toMemberId,
        amount: t.amount,
        createdAt: now,
      });
    }

    // Update session status
    await db
      .update(sessions)
      .set({ status: 'settled', endedAt: now })
      .where(eq(sessions.id, params.id));

    // Log operation
    await db.insert(operationLogs).values({
      id: generateId(),
      sessionId: params.id,
      operationType: 'settle',
      payload: JSON.stringify({ settlements: memberResults, transfers }),
      createdAt: now,
      clientTimestamp: now,
    });

    return NextResponse.json({
      settlements: memberResults.map((mr) => ({
        ...mr,
        totalAmount: balances.find((b) => b.memberId === mr.memberId)?.amount ?? 0,
      })),
      transfers,
    });
  } catch (error) {
    console.error('Failed to settle session:', error);
    return NextResponse.json({ error: '清算に失敗しました' }, { status: 500 });
  }
}
