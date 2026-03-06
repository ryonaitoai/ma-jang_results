'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, UserX } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AVATAR_EMOJIS } from '@/lib/constants';
import type { Member } from '@/types';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [name, setName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🀄');
  const [memo, setMemo] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      setMembers(data);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const openAddModal = () => {
    setEditingMember(null);
    setName('');
    setAvatarEmoji('🀄');
    setMemo('');
    setIsModalOpen(true);
  };

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setName(member.name);
    setAvatarEmoji(member.avatarEmoji);
    setMemo(member.memo || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      if (editingMember) {
        await fetch(`/api/members/${editingMember.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, avatarEmoji, memo }),
        });
      } else {
        await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, avatarEmoji, memo }),
        });
      }
      setIsModalOpen(false);
      fetchMembers();
    } catch (error) {
      console.error('Failed to save member:', error);
    }
  };

  const handleDeactivate = async (member: Member) => {
    if (!confirm(`${member.name}を非アクティブにしますか？`)) return;

    try {
      await fetch(`/api/members/${member.id}`, { method: 'DELETE' });
      fetchMembers();
    } catch (error) {
      console.error('Failed to deactivate member:', error);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-game-gold">メンバー</h1>
        <Button onClick={openAddModal} size="sm">
          <Plus size={18} className="mr-1 inline" />
          追加
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-game-muted py-12">読み込み中...</div>
      ) : members.length === 0 ? (
        <div className="text-center text-game-muted py-12">
          <p className="text-4xl mb-4">🀄</p>
          <p>メンバーがまだいません</p>
          <p className="text-sm mt-1">「追加」ボタンからメンバーを登録してください</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between bg-felt-700 border border-felt-500/50 rounded-sm p-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{member.avatarEmoji}</span>
                <div>
                  <p className="font-medium">{member.name}</p>
                  {member.memo && (
                    <p className="text-sm text-game-muted">{member.memo}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEditModal(member)}
                  className="p-2 rounded-sm hover:bg-felt-600 transition-colors"
                >
                  <Pencil size={18} className="text-game-muted" />
                </button>
                <button
                  onClick={() => handleDeactivate(member)}
                  className="p-2 rounded-sm hover:bg-felt-600 transition-colors"
                >
                  <UserX size={18} className="text-game-muted" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMember ? 'メンバー編集' : 'メンバー追加'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-game-muted mb-1">名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="表示名を入力"
              className="w-full bg-felt-900 rounded-sm px-4 py-3 text-game-white focus:outline-none focus:ring-2 focus:ring-game-green"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-game-muted mb-2">アバター</label>
            <div className="grid grid-cols-8 gap-2">
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setAvatarEmoji(emoji)}
                  className={`text-2xl p-2 rounded-sm transition-all ${
                    avatarEmoji === emoji
                      ? 'bg-game-green/20 ring-2 ring-game-green scale-110'
                      : 'hover:bg-felt-600'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-game-muted mb-1">メモ</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="任意のメモ"
              className="w-full bg-felt-900 rounded-sm px-4 py-3 text-game-white focus:outline-none focus:ring-2 focus:ring-game-green"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full"
            size="lg"
          >
            {editingMember ? '更新' : '追加'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
