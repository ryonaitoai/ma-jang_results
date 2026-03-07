import { NextResponse } from 'next/server';
import { db } from '@/db';
import { members, hanchanScores, hanchan, sessions, settlements } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';

// Disable static caching — always fetch fresh data
export const dynamic = 'force-dynamic';

// GET /api/analytics - Get all members' stats for ranking table
export async function GET() {
  try {
    const allMembers = await db
      .select()
      .from(members)
      .where(eq(members.isActive, true))
      .orderBy(members.createdAt);

    // Fetch all valid scores in one query
    const allScores = await db
      .select({
        memberId: hanchanScores.memberId,
        point: hanchanScores.point,
        rank: hanchanScores.rank,
        rawScore: hanchanScores.rawScore,
        sessionId: hanchan.sessionId,
      })
      .from(hanchanScores)
      .innerJoin(hanchan, eq(hanchanScores.hanchanId, hanchan.id))
      .innerJoin(sessions, eq(hanchan.sessionId, sessions.id))
      .where(
        and(
          eq(hanchan.isVoid, false),
          ne(sessions.status, 'cancelled')
        )
      );

    // Fetch all settlements in one query
    const allSettlements = await db
      .select({
        memberId: settlements.memberId,
        totalAmount: settlements.totalAmount,
      })
      .from(settlements)
      .innerJoin(sessions, eq(settlements.sessionId, sessions.id))
      .where(eq(sessions.status, 'settled'));

    // Build stats per member
    const memberStats = allMembers.map((member) => {
      const scores = allScores.filter((s) => s.memberId === member.id);
      const memberSettlements = allSettlements.filter((s) => s.memberId === member.id);
      const totalHanchan = scores.length;

      if (totalHanchan === 0) {
        return {
          member,
          totalHanchan: 0,
          totalSessions: 0,
          totalPoints: 0,
          totalAmount: 0,
          averageRank: 0,
          rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
          rentaiRate: 0,
          topRate: 0,
          lastRate: 0,
        };
      }

      const sessionIds = new Set(scores.map((s) => s.sessionId));
      const totalPoints = scores.reduce((sum, s) => sum + s.point, 0);
      const totalAmount = memberSettlements.reduce((sum, s) => sum + s.totalAmount, 0);

      const rankDistribution = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<number, number>;
      let totalRank = 0;
      for (const s of scores) {
        rankDistribution[s.rank] = (rankDistribution[s.rank] || 0) + 1;
        totalRank += s.rank;
      }

      return {
        member,
        totalHanchan,
        totalSessions: sessionIds.size,
        totalPoints,
        totalAmount,
        averageRank: totalRank / totalHanchan,
        rankDistribution,
        rentaiRate: (rankDistribution[1] + rankDistribution[2]) / totalHanchan,
        topRate: rankDistribution[1] / totalHanchan,
        lastRate: rankDistribution[4] / totalHanchan,
      };
    });

    // Sort by totalPoints descending (members with data first)
    memberStats.sort((a, b) => {
      if (a.totalHanchan === 0 && b.totalHanchan === 0) return 0;
      if (a.totalHanchan === 0) return 1;
      if (b.totalHanchan === 0) return -1;
      return b.totalPoints - a.totalPoints;
    });

    return NextResponse.json(memberStats);
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: '分析データの取得に失敗しました' }, { status: 500 });
  }
}
