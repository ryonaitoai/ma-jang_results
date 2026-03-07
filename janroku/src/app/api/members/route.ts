import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { members } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET /api/members - List all active members
export async function GET() {
  try {
    const allMembers = await db
      .select()
      .from(members)
      .where(eq(members.isActive, true))
      .orderBy(members.createdAt);

    return NextResponse.json(allMembers);
  } catch (error) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json({ error: 'メンバーの取得に失敗しました' }, { status: 500 });
  }
}

// POST /api/members - Create a new member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, avatarEmoji, memo } = body as {
      name: string;
      avatarEmoji?: string;
      memo?: string;
    };

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: '名前は必須です' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newMember = {
      id: generateId(),
      name: name.trim(),
      avatarEmoji: avatarEmoji || '🀄',
      memo: memo || null,
      createdAt: now,
      isActive: true,
    };

    await db.insert(members).values(newMember);

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error('Failed to create member:', error);
    return NextResponse.json({ error: 'メンバーの作成に失敗しました' }, { status: 500 });
  }
}
