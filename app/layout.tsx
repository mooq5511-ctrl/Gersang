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
import './ability-panel.css';
import './classic-map-interface.css';
import './readability.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: '放置你的巨商魂',
  description: '以經典東方商旅 MMORPG 為靈感的網頁版野外遊戲介面。',
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
