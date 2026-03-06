import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, sessionMembers, hanchan } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateId } from '@/lib/utils';

// GET /api/sessions - List sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = db.select().from(sessions).orderBy(desc(sessions.createdAt));

    const allSessions = status
      ? await query.where(eq(sessions.status, status as 'active' | 'settled' | 'cancelled'))
      : await query;

    // Fetch members for each session
    const sessionsWithMembers = await Promise.all(
      allSessions.map(async (session) => {
        const members = await db.query.sessionMembers.findMany({
          where: eq(sessionMembers.sessionId, session.id),
          with: { member: true },
          orderBy: (sm) => sm.seatOrder,
        });
        const sessionHanchan = await db.query.hanchan.findMany({
          where: eq(hanchan.sessionId, session.id),
          columns: { id: true, isVoid: true },
        });
        return { ...session, members, hanchan: sessionHanchan };
      })
    );

    return NextResponse.json(sessionsWithMembers);
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json({ error: 'セッションの取得に失敗しました' }, { status: 500 });
  }
}

// POST /api/sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      date,
      memberIds,
      startingPoints = 25000,
      returnPoints = 30000,
      umaFirst = 30,
      umaSecond = 10,
      umaThird = -10,
      umaFourth = -30,
      chipEnabled = false,
      chipValue = 100,
      rate = '点ピン',
      rateValue = 100,
      rulePresetId,
      memo,
    } = body as {
      date: string;
      memberIds: string[];
      startingPoints?: number;
      returnPoints?: number;
      umaFirst?: number;
      umaSecond?: number;
      umaThird?: number;
      umaFourth?: number;
      chipEnabled?: boolean;
      chipValue?: number;
      rate?: string;
      rateValue?: number;
      rulePresetId?: string;
      memo?: string;
    };

    if (!memberIds || memberIds.length < 4) {
      return NextResponse.json({ error: '4人以上のメンバーが必要です' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const sessionId = generateId();

    // Create session
    await db.insert(sessions).values({
      id: sessionId,
      date: date || new Date().toISOString().split('T')[0],
      rulePresetId: rulePresetId || null,
      status: 'active',
      startingPoints,
      returnPoints,
      umaFirst,
      umaSecond,
      umaThird,
      umaFourth,
      chipEnabled,
      chipValue,
      rate,
      rateValue,
      startedAt: now,
      memo: memo || null,
      createdAt: now,
    });

    // Create session members with seat order
    for (let i = 0; i < memberIds.length; i++) {
      await db.insert(sessionMembers).values({
        id: generateId(),
        sessionId,
        memberId: memberIds[i],
        seatOrder: i + 1,
      });
    }

    return NextResponse.json({ id: sessionId }, { status: 201 });
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json({ error: 'セッションの作成に失敗しました' }, { status: 500 });
  }
}
