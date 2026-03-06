import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, sessionMembers, hanchan, hanchanScores } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

// GET /api/sessions/[id] - Get session with all data
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

    return NextResponse.json({
      ...session,
      members,
      hanchan: hanchanWithScores,
    });
  } catch (error) {
    console.error('Failed to fetch session:', error);
    return NextResponse.json({ error: 'セッションの取得に失敗しました' }, { status: 500 });
  }
}

// PUT /api/sessions/[id] - Update session
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    await db.update(sessions).set(body).where(eq(sessions.id, params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update session:', error);
    return NextResponse.json({ error: 'セッションの更新に失敗しました' }, { status: 500 });
  }
}
