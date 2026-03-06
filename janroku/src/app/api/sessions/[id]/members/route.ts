import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, sessionMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/utils';

// POST /api/sessions/[id]/members - Add member to session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, params.id),
    });

    if (!session) {
      return NextResponse.json({ error: 'セッションが見つかりません' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'アクティブなセッションにのみメンバーを追加できます' }, { status: 400 });
    }

    const { memberId } = await request.json();

    // Check if already in session
    const existing = await db.query.sessionMembers.findMany({
      where: eq(sessionMembers.sessionId, params.id),
    });

    if (existing.some((m) => m.memberId === memberId)) {
      return NextResponse.json({ error: 'すでに参加しています' }, { status: 400 });
    }

    const maxSeatOrder = existing.reduce((max, m) => Math.max(max, m.seatOrder), 0);

    await db.insert(sessionMembers).values({
      id: generateId(),
      sessionId: params.id,
      memberId,
      seatOrder: maxSeatOrder + 1,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to add member:', error);
    return NextResponse.json({ error: 'メンバーの追加に失敗しました' }, { status: 500 });
  }
}
