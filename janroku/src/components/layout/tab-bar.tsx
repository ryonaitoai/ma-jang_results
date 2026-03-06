'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Gamepad2, History, BarChart3, Settings } from 'lucide-react';

const tabs = [
  { href: '/', label: 'ホーム', icon: Home },
  { href: '/sessions/new', label: '対局', icon: Gamepad2 },
  { href: '/history', label: '履歴', icon: History },
  { href: '/analytics', label: '分析', icon: BarChart3 },
  { href: '/settings', label: '設定', icon: Settings },
];

export function TabBar() {
  const pathname = usePathname();

  // Hide tab bar on score input page
  if (pathname.includes('/input')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-felt-900 border-t-2 border-frame-outer z-40">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors relative ${
                isActive ? 'text-game-gold' : 'text-game-muted'
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-game-gold rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
