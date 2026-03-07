import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { members, hanchanScores, hanchan, sessions, settlements } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';

// GET /api/members/[id]/stats - Get member statistics
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const member = await db.query.members.findFirst({
      where: eq(members.id, params.id),
    });

    if (!member) {
      return NextResponse.json({ error: 'メンバーが見つかりません' }, { status: 404 });
    }

    // Fetch all scores for this member with hanchan and session info
    const scores = await db
      .select({
        scoreId: hanchanScores.id,
        point: hanchanScores.point,
        rank: hanchanScores.rank,
        rawScore: hanchanScores.rawScore,
        hanchanId: hanchanScores.hanchanId,
        isVoid: hanchan.isVoid,
        sessionId: hanchan.sessionId,
        sessionStatus: sessions.status,
        sessionDate: sessions.date,
        hanchanNumber: hanchan.hanchanNumber,
        createdAt: hanchanScores.createdAt,
      })
      .from(hanchanScores)
      .innerJoin(hanchan, eq(hanchanScores.hanchanId, hanchan.id))
      .innerJoin(sessions, eq(hanchan.sessionId, sessions.id))
      .where(
        and(
          eq(hanchanScores.memberId, params.id),
          eq(hanchan.isVoid, false),
          ne(sessions.status, 'cancelled')
        )
      );

    // Fetch settlement data
    const memberSettlements = await db
      .select({
        totalPoint: settlements.totalPoint,
        totalChips: settlements.totalChips,
        totalAmount: settlements.totalAmount,
        sessionId: settlements.sessionId,
      })
      .from(settlements)
      .innerJoin(sessions, eq(settlements.sessionId, sessions.id))
      .where(
        and(
          eq(settlements.memberId, params.id),
          eq(sessions.status, 'settled')
        )
      );

    const totalHanchan = scores.length;

    if (totalHanchan === 0) {
      return NextResponse.json({
        member,
        totalHanchan: 0,
        totalSessions: 0,
        settledSessions: 0,
        totalPoints: 0,
        totalAmount: 0,
        averageRank: 0,
        rankDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
        rankRates: { 1: 0, 2: 0, 3: 0, 4: 0 },
        rentaiRate: 0,
        averagePoints: 0,
        maxPoints: 0,
        minPoints: 0,
        tobiCount: 0,
        tobiRate: 0,
        recentScores: [],
      });
    }

    // Unique sessions
    const sessionIds = new Set(scores.map((s) => s.sessionId));
    const totalSessions = sessionIds.size;
    const settledSessions = memberSettlements.length;

    // Points
    const totalPoints = scores.reduce((sum, s) => sum + s.point, 0);
    const averagePoints = totalPoints / totalHanchan;
    const maxPoints = Math.max(...scores.map((s) => s.point));
    const minPoints = Math.min(...scores.map((s) => s.point));

    // Amount from settlements
    const totalAmount = memberSettlements.reduce((sum, s) => sum + s.totalAmount, 0);

    // Rank distribution
    const rankDistribution = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<number, number>;
    let totalRank = 0;
    for (const s of scores) {
      rankDistribution[s.rank] = (rankDistribution[s.rank] || 0) + 1;
      totalRank += s.rank;
    }
    const averageRank = totalRank / totalHanchan;
    const rankRates = {
      1: rankDistribution[1] / totalHanchan,
      2: rankDistribution[2] / totalHanchan,
      3: rankDistribution[3] / totalHanchan,
      4: rankDistribution[4] / totalHanchan,
    };
    const rentaiRate = (rankDistribution[1] + rankDistribution[2]) / totalHanchan;

    // Tobi (raw_score <= 0 means busted)
    const tobiCount = scores.filter((s) => s.rawScore !== null && s.rawScore <= 0).length;
    const tobiRate = tobiCount / totalHanchan;

    // Sort by date + hanchan number for chronological order
    const chronological = [...scores].sort((a, b) => {
      const dateCmp = a.sessionDate.localeCompare(b.sessionDate);
      if (dateCmp !== 0) return dateCmp;
      const sessionCmp = a.createdAt.localeCompare(b.createdAt);
      if (sessionCmp !== 0) return sessionCmp;
      return a.hanchanNumber - b.hanchanNumber;
    });

    // Cumulative points for chart
    let cumulative = 0;
    const pointsTimeline = chronological.map((s, i) => {
      cumulative += s.point;
      return {
        index: i + 1,
        date: s.sessionDate,
        point: s.point,
        cumulative,
        rank: s.rank,
      };
    });

    // Monthly aggregation
    const monthlyMap = new Map<string, { points: number; count: number; ranks: number[] }>();
    for (const s of chronological) {
      const month = s.sessionDate.substring(0, 7); // YYYY-MM
      const entry = monthlyMap.get(month) || { points: 0, count: 0, ranks: [] };
      entry.points += s.point;
      entry.count += 1;
      entry.ranks.push(s.rank);
      monthlyMap.set(month, entry);
    }
    const monthlyStats = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      points: data.points,
      count: data.count,
      averageRank: data.ranks.reduce((a, b) => a + b, 0) / data.ranks.length,
    }));

    // Recent scores (latest 20)
    const recentScores = [...scores]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20)
      .map((s) => ({
        date: s.sessionDate,
        point: s.point,
        rank: s.rank,
      }));

    return NextResponse.json({
      member,
      totalHanchan,
      totalSessions,
      settledSessions,
      totalPoints,
      totalAmount,
      averageRank,
      rankDistribution,
      rankRates,
      rentaiRate,
      averagePoints,
      maxPoints,
      minPoints,
      tobiCount,
      tobiRate,
      recentScores,
      pointsTimeline,
      monthlyStats,
    });
  } catch (error) {
    console.error('Failed to fetch member stats:', error);
    return NextResponse.json({ error: '成績の取得に失敗しました' }, { status: 500 });
  }
}
