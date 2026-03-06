import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { members } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/members/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const member = await db
      .select()
      .from(members)
      .where(eq(members.id, params.id))
      .get();

    if (!member) {
      return NextResponse.json({ error: 'メンバーが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error('Failed to fetch member:', error);
    return NextResponse.json({ error: 'メンバーの取得に失敗しました' }, { status: 500 });
  }
}

// PUT /api/members/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, avatarEmoji, memo, isActive } = body as {
      name?: string;
      avatarEmoji?: string;
      memo?: string;
      isActive?: boolean;
    };

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (avatarEmoji !== undefined) updates.avatarEmoji = avatarEmoji;
    if (memo !== undefined) updates.memo = memo;
    if (isActive !== undefined) updates.isActive = isActive;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '更新する項目がありません' }, { status: 400 });
    }

    await db.update(members).set(updates).where(eq(members.id, params.id));

    const updated = await db
      .select()
      .from(members)
      .where(eq(members.id, params.id))
      .get();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update member:', error);
    return NextResponse.json({ error: 'メンバーの更新に失敗しました' }, { status: 500 });
  }
}

// DELETE /api/members/[id] - Soft delete (set is_active to false)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db
      .update(members)
      .set({ isActive: false })
      .where(eq(members.id, params.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to deactivate member:', error);
    return NextResponse.json({ error: 'メンバーの無効化に失敗しました' }, { status: 500 });
  }
}
