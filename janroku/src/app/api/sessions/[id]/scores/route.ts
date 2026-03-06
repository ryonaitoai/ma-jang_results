import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, sessionMembers, hanchan, hanchanScores } from '@/db/schema';
import { eq, asc, desc } from 'drizzle-orm';

// GET /api/sessions/[id]/scores - Polling endpoint for real-time viewing
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, params.id),
    });

    if (!session) {
      return NextResponse.json({ error: 'セッションが見つかりません' }, { status: 404 });
    }

    // Fetch members
    const members = await db.query.sessionMembers.findMany({
      where: eq(sessionMembers.sessionId, params.id),
      with: { member: true },
      orderBy: (sm) => sm.seatOrder,
    });

    // Fetch hanchan with scores
    const allHanchan = await db
      .select()
      .from(hanchan)
      .where(eq(hanchan.sessionId, params.id))
      .orderBy(asc(hanchan.hanchanNumber));

    const hanchanWithScores = await Promise.all(
      allHanchan.map(async (h) => {
        const scores = await db.query.hanchanScores.findMany({
          where: eq(hanchanScores.hanchanId, h.id),
          with: { member: true },
        });
        return { ...h, scores };
      })
    );

    // Calculate lastUpdated from the most recent score or hanchan creation
    let lastUpdated = session.createdAt;
    for (const h of hanchanWithScores) {
      if (h.createdAt > lastUpdated) lastUpdated = h.createdAt;
      for (const s of h.scores) {
        if (s.createdAt > lastUpdated) lastUpdated = s.createdAt;
      }
    }

    return NextResponse.json({
      session: {
        id: session.id,
        date: session.date,
        status: session.status,
        chipEnabled: session.chipEnabled,
        rateValue: session.rateValue,
      },
      members,
      hanchan: hanchanWithScores,
      lastUpdated,
    });
  } catch (error) {
    console.error('Failed to fetch scores:', error);
    return NextResponse.json({ error: 'スコアの取得に失敗しました' }, { status: 500 });
  }
}
