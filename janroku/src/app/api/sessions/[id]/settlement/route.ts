import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { settlements, settlementTransfers, members } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/sessions/[id]/settlement - Get settlement data
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const settlementData = await db.query.settlements.findMany({
      where: eq(settlements.sessionId, params.id),
      with: { member: true },
    });

    const transferData = await db
      .select()
      .from(settlementTransfers)
      .where(eq(settlementTransfers.sessionId, params.id));

    // Get member names for transfers
    const transfersWithNames = await Promise.all(
      transferData.map(async (t) => {
        const fromMember = await db.query.members.findFirst({
          where: eq(members.id, t.fromMemberId),
        });
        const toMember = await db.query.members.findFirst({
          where: eq(members.id, t.toMemberId),
        });
        return {
          ...t,
          fromName: fromMember?.name ?? '',
          toName: toMember?.name ?? '',
        };
      })
    );

    return NextResponse.json({
      settlements: settlementData
        .map((s) => ({
          memberId: s.memberId,
          memberName: s.member.name,
          totalPoint: s.totalPoint,
          totalChips: s.totalChips,
          totalAmount: s.totalAmount,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount),
      transfers: transfersWithNames,
    });
  } catch (error) {
    console.error('Failed to fetch settlement:', error);
    return NextResponse.json({ error: '清算データの取得に失敗しました' }, { status: 500 });
  }
}
