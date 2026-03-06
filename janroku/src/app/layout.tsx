import type { Metadata, Viewport } from 'next';
import { TabBar } from '@/components/layout/tab-bar';
import './globals.css';

export const metadata: Metadata = {
  title: '雀録 - JanRoku',
  description: 'セットマージャン成績管理システム',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f1f17',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-mahjong-surface text-mahjong-text">
        <main className="pb-20 max-w-lg mx-auto">
          {children}
        </main>
        <TabBar />
      </body>
    </html>
  );
}
