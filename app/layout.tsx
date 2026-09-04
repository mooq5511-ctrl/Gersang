import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './trade.css';
import './caravan-status.css';
import './hero-status.css';
import './inventory.css';
import './dungeon.css';
import './classic-fusion.css';
import './battle-impact.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: '商途・巨商放置錄 V22',
  description: '東海商路與 BT52Gersang 融合版：戰敗自動返回客棧、四國二十城、九人商隊與放置貿易。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
