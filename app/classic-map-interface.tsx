"use client";

import { useState } from "react";
import {
  Backpack,
  BookOpenText,
  ChevronRight,
  CircleHelp,
  Coins,
  Mail,
  Map,
  ScrollText,
  Settings,
  ShieldCheck,
  Swords,
  Users,
} from "lucide-react";

const party = [
  ["韓湘子", "korea_1.gif", 250, "術士"],
  ["許浚", "korea_2.gif", 246, "醫師"],
  ["趙士林", "china_1.gif", 241, "槍兵"],
  ["燕霞", "china_2.gif", 238, "弓手"],
  ["雷功", "china_3.gif", 234, "法師"],
  ["芭蕉羅剎", "taiwan_1.gif", 229, "馭獸"],
  ["源義經", "japan_1.gif", 225, "武士"],
  ["阿國", "japan_2.gif", 218, "巫女"],
  ["花郎", "korea_3.gif", 214, "射手"],
];

const quickActions = [
  [Backpack, "背包"],
  [ScrollText, "任務"],
  [BookOpenText, "圖鑑"],
  [Map, "地圖"],
];

const messages = {
  一般: [
    "[系統] 黑雲寨附近出現了可疑的商隊。",
    "[隊伍] 韓湘子：前方霧氣很重，先整頓隊伍吧。",
    "[獲得] 石榴酒 × 6、封珠 × 1",
  ],
  商團: [
    "[商團] 海東商會正在收購藥草。",
    "[商團] 今日漢陽—釜山商路運費降低 12%。",
  ],
  設定: [
    "戰鬥訊息：顯示",
    "交易邀請：僅限好友",
  ],
};

export default function ClassicMapInterface() {
  const [selected, setSelected] = useState(0);
  const [chat, setChat] = useState<keyof typeof messages>("一般");
  const [peaceful, setPeaceful] = useState(true);
  const [notice, setNotice] = useState("野外地圖已載入");

  const triggerAction = (label: string) => {
    setNotice(`${label}面板已開啟`);
    window.setTimeout(() => setNotice("野外地圖已載入"), 1600);
  };

  return (
    <main className="retro-game min-h-screen w-full overflow-hidden bg-[#050706] text-[#e7dfc9]">
      <section className="game-frame relative mx-auto aspect-[4/3] h-screen max-h-[100vw] min-h-[580px] overflow-hidden border border-[#74654a] bg-[#26331d] shadow-2xl">
        <div className="world-scene absolute inset-0" aria-label="山林野外地圖">
          <div className="map-vignette" />

          <div className="absolute left-[31%] top-[41%] flex items-end gap-1">
            <figure className="unit-sprite">
              <span className="nameplate">護商隊・蒼龍</span>
              <img src="/game-assets/merchant-0.png" alt="商隊領隊" />
              <i className="selection-ring" />
            </figure>
            <figure className="unit-sprite unit-sprite-small">
              <img src="/game-assets/merc-samurai-0.png" alt="護衛武士" />
            </figure>
            <figure className="unit-sprite unit-sprite-beast">
              <span className="nameplate enemy">巡山靈獸</span>
              <img src="/game-assets/tiger-0.png" alt="巡山靈獸" />
            </figure>
          </div>

          <div className="loot-label left-[21%] top-[50%]">收：石榴酒 86　封珠 PM</div>
          <div className="loot-label left-[43%] top-[34%]">收石榴酒4倍　放辰式甲鞋 20</div>
          <div className="loot-label left-[8%] top-[43%]">買封珠2G　封書25E</div>

          <div className="map-corner absolute right-4 top-4" aria-label="小地圖">
            <div className="mini-route" />
            <span className="mini-dot" />
          </div>

          <div className="absolute right-3 top-[68%] grid gap-2">
            {quickActions.map(([Icon, label]) => {
              const ActionIcon = Icon as typeof Backpack;
              return (
                <button key={label as string} className="quick-button" onClick={() => triggerAction(label as string)} title={label as string}>
                  <ActionIcon aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <div className="toast-message absolute left-1/2 top-[14%] -translate-x-1/2">{notice}</div>
        </div>

        <aside className="party-rail absolute inset-y-0 left-0 z-20 w-[8.2%] min-w-[72px] px-1 py-1.5" aria-label="隊伍名單">
          <div className="mb-1 flex items-center justify-between px-1 text-[10px] text-[#d7bf77]">
            <span>隊伍</span><span>9/12</span>
          </div>
          <div className="grid gap-[3px]">
            {party.map(([name, image, level, role], index) => (
              <button
                key={name}
                onClick={() => setSelected(index)}
                className={`party-card relative overflow-hidden text-left ${selected === index ? "is-selected" : ""}`}
                aria-label={`選擇 ${name}`}
              >
                <img src={`/assets/mercenary-portraits/${image}`} alt="" />
                <span className="party-meta">Lv.{level} · {role}</span>
                <span className="hp-line"><i style={{ width: `${91 - index * 3}%` }} /></span>
                <span className="mp-line"><i style={{ width: `${78 + (index % 3) * 7}%` }} /></span>
              </button>
            ))}
          </div>
          <button className="rail-handle" aria-label="收合隊伍"><ChevronRight /></button>
        </aside>

        <footer className="bottom-hud absolute inset-x-0 bottom-0 z-30 h-[15.5%] min-h-[105px] px-2 pb-2 pt-1.5">
          <div className="grid h-full grid-cols-[24%_1fr_25%] gap-2">
            <section className="status-panel flex min-w-0 flex-col justify-between px-2 py-1.5" aria-label="角色狀態">
              <div className="flex items-center gap-2">
                <div className="level-badge"><small>LV</small><strong>250</strong></div>
                <img className="hero-portrait" src={`/assets/mercenary-portraits/${party[selected][1]}`} alt={party[selected][0] as string} />
                <div className="min-w-0">
                  <strong className="block truncate text-xs text-[#f1e8cf]">{party[selected][0]}</strong>
                  <span className="block truncate text-[10px] text-[#aaa18c]">皇朝極國學 · 行首</span>
                </div>
              </div>
              <div className="resource-row"><Coins /><span>3,833,657</span><Swords /><span>122</span></div>
              <div className="resource-row"><ShieldCheck /><span>19,175,615</span><Users /><span>12</span></div>
            </section>

            <section className="chat-panel relative min-w-0" aria-label="聊天視窗">
              <nav className="chat-tabs absolute -top-6 right-0 flex">
                {(Object.keys(messages) as Array<keyof typeof messages>).map((tab) => (
                  <button key={tab} onClick={() => setChat(tab)} className={chat === tab ? "active" : ""}>{tab}</button>
                ))}
              </nav>
              <div className="h-[calc(100%-24px)] overflow-hidden px-2 py-1 text-[11px] leading-[1.55] text-[#62ef42]">
                {messages[chat].map((message) => <p key={message}>{message}</p>)}
              </div>
              <div className="chat-input flex h-6 items-center gap-1 px-1.5">
                <span className="text-[10px] text-[#d8c992]">一般</span>
                <input aria-label="聊天訊息" placeholder="輸入訊息…" />
                <button aria-label="表情">☺</button>
                <button aria-label="送出">➤</button>
              </div>
            </section>

            <section className="action-panel flex flex-col justify-between p-1.5" aria-label="快捷功能">
              <div className="grid grid-cols-6 gap-1">
                {[Backpack, Swords, ScrollText, BookOpenText, CircleHelp, Mail].map((Icon, index) => (
                  <button key={index} className="hud-button" onClick={() => triggerAction(["道具", "技能", "任務", "圖鑑", "幫助", "郵件"][index])}>
                    <Icon aria-hidden="true" />
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <button className={`mode-button flex-1 ${peaceful ? "active" : ""}`} onClick={() => setPeaceful(!peaceful)}>
                  {peaceful ? "和平模式" : "戰鬥模式"}
                </button>
                <button className="mode-button flex-1" onClick={() => triggerAction("交易")}>同意交易</button>
                <button className="hud-button"><Settings aria-hidden="true" /></button>
              </div>
              <div className="game-time text-center text-[10px] text-[#e7dcc0]">1563年 8月 28日　21時</div>
            </section>
          </div>
        </footer>
      </section>
    </main>
  );
}
