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
  themeColor: '#0a1a10',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=M+PLUS+1:wght@400;500;700;900&family=M+PLUS+1+Code:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-felt-800 text-game-white font-game font-medium">
        <main className="pb-20 max-w-lg mx-auto">
          {children}
        </main>
        <TabBar />
      </body>
    </html>
  );
}
