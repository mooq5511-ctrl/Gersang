"use client";

import { useEffect, useMemo, useState } from "react";
import { Bolt, Crown, Shield, Sparkles, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { THUNDER_FORGE_RECIPES, type ThunderForgeId } from './mythic-forge';
import "./thunder-altar-raid.css";

type Status = "ready" | "fighting" | "failed" | "cleared";
type Phase = 0 | 1 | 2;

const ENTRY_COST = 50_000;
const BOSSES = [
  { name: "喵兒", title: "雷影妖姬", time: 70, factor: 5, skill: "殘影分身：範圍傷害可快速瓦解分身；命中不足時首領閃避提高。", enrage: "千影獵殺" },
  { name: "守護弓手・泰貞", title: "雷弦守護者", time: 80, factor: 8, skill: "蓄力貫穿箭：以護盾承傷，或使用控場打斷蓄力。", enrage: "萬箭雷鳴" },
  { name: "鹿亞", title: "雷翼獸王", time: 90, factor: 11, skill: "召喚雷雲與全場雷暴：需要持續治療，最後 30 秒必須全力爆發。", enrage: "末日神罰" },
] as const;

const gain = (materials: Record<string, number>, rewards: Record<string, number>) => Object.entries(rewards).reduce((next, [name, amount]) => ({ ...next, [name]: (next[name] || 0) + amount }), { ...materials });

export function ThunderAltarRaid({ credit, power, materials, azureSetPieces, chiyouSetPieces, amaterasuSetPieces, onEnter, onRefund, onMaterials, onForge, onNotice }: {
  credit: number; power: number; materials: Record<string, number>;
  azureSetPieces: number; chiyouSetPieces: number; amaterasuSetPieces:number; onEnter: () => void; onRefund: () => void; onMaterials: (next: Record<string, number>) => void; onForge: (id: ThunderForgeId) => void; onNotice: (text: string) => void;
}) {
  const [status, setStatus] = useState<Status>("ready");
  const [phase, setPhase] = useState<Phase>(0);
  const [hp, setHp] = useState(0);
  const [maxHp, setMaxHp] = useState(1);
  const [seconds, setSeconds] = useState(240);
  const [phaseSeconds, setPhaseSeconds] = useState<number>(BOSSES[0].time);
  const [integrity, setIntegrity] = useState(100);
  const [burstReady, setBurstReady] = useState(true);
  const [message, setMessage] = useState("祭壇封印尚未解除。");
  const raidPower = Math.max(1_000, power);
  const setBonus=(pieces:number,bonus:[number,number,number])=>pieces>=5?bonus[2]:pieces>=3?bonus[1]:pieces>=2?bonus[0]:0;
  const dps = Math.max(50, Math.floor(raidPower * .12 * (1+setBonus(azureSetPieces,[.1,.2,.35])+setBonus(chiyouSetPieces,[.12,.25,.4])+setBonus(amaterasuSetPieces,[.15,.3,.45]))));
  const bossHp = useMemo(() => BOSSES.map(boss => Math.floor(raidPower * boss.factor)), [raidPower]);

  const finishFailure = (passed: Phase) => {
    const rewards: Record<string, number> = passed === 0 ? { "雷祭印記": 1, "小型雷之屬性石": 3 } : passed === 1 ? { "雷祭印記": 2, "小型雷之屬性石": 6, "喵兒的尾巴": 1 } : { "雷祭印記": 3, "小型雷之屬性石": 10, "喵兒的尾巴": 1, "雷電的箭矢": 1 };
    onRefund();
    onMaterials(gain(materials, rewards));
    setStatus("failed"); setMessage(`挑戰失敗，退回 25,000 信用值並取得參與獎勵。`);
  };

  const clearRaid = () => {
    const rewards = { "雷祭印記": 6, "小型雷之屬性石": 20, "精氣之珠碎片": 12, "喵兒的尾巴": 2, "雷電的箭矢": 2, "鹿亞之角": 1, "深淵的精髓": 1, "青龍頭盔": 1, "[玉衡]咒術秘訣": 1 };
    onMaterials(gain(materials, rewards));
    setStatus("cleared"); setMessage("雷霆祭壇已鎮壓，專屬鍛造材料已收入背包。");
  };

  useEffect(() => {
    if (status !== "fighting") return;
    const timer = window.setInterval(() => {
      setSeconds(value => Math.max(0, value - 1));
      setPhaseSeconds(value => Math.max(0, value - 1));
      setHp(value => Math.max(0, value - dps));
      setIntegrity(value => Math.max(0, value - (phase === 0 ? 0.35 : phase === 1 ? 0.65 : 1.05)));
      setBurstReady(true);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status, dps, phase]);

  useEffect(() => {
    if (status !== "fighting") return;
    if (seconds <= 0 || integrity <= 0) { finishFailure(phase); return; }
    if (hp > 0) return;
    if (phase === 2) { clearRaid(); return; }
    const next = (phase + 1) as Phase;
    setPhase(next); setMaxHp(bossHp[next]); setHp(bossHp[next]); setPhaseSeconds(BOSSES[next].time);
    setMessage(`${BOSSES[phase].name} 已擊破，${BOSSES[next].name} 降臨祭壇。`);
  }, [hp, seconds, integrity, status, phase, bossHp]);

  const start = () => {
    if (credit < ENTRY_COST) { onNotice("信用值不足，需要 50,000 信用值才能進入雷霆祭壇。"); return; }
    onEnter(); setStatus("fighting"); setPhase(0); setMaxHp(bossHp[0]); setHp(bossHp[0]); setSeconds(240); setPhaseSeconds(BOSSES[0].time); setIntegrity(100); setMessage("雷霆祭壇開啟：喵兒以殘影包圍隊伍。 ");
  };
  const burst = () => {
    if (status !== "fighting" || !burstReady) return;
    const bonus = Math.floor(dps * (phase === 0 ? 12 : phase === 1 ? 10 : 14));
    setHp(value => Math.max(0, value - bonus)); setBurstReady(false); setMessage(`合擊雷印命中，造成 ${bonus.toLocaleString()} 點爆發傷害。`);
  };

  const boss = BOSSES[phase];
  return <section className="thunder-raid" aria-label="神仙谷雷霆祭壇">
    <header className="raid-header"><div><small>神仙谷・特殊高難度副本</small><h2><Bolt />雷霆祭壇</h2><p>240 秒內連戰三位雷屬性首領。入場消耗 50,000 信用值，失敗退回 25,000 信用值並保留參與獎勵。</p></div><div className="raid-entry"><strong>{credit.toLocaleString()}</strong><span>持有信用值</span><Button disabled={status === "fighting" || credit < ENTRY_COST} onClick={start}><Crown />進入祭壇・50,000</Button></div></header>
    <div className="raid-phases">{BOSSES.map((item, index) => <article key={item.name} className={index === phase ? "active" : index < phase || status === "cleared" ? "done" : ""}><b>Phase {index + 1}</b><strong>{item.name}</strong><small>{index === 0 ? "命中／範圍" : index === 1 ? "護盾／控場" : "治療／爆發"}</small></article>)}</div>
    <section className="raid-arena">
      <div className={`raid-boss boss-phase-${phase}`}><div className="raid-boss-art" role="img" aria-label={`${boss.name} 首領圖像`} /><small>{boss.title}・雷屬性</small><h3>{boss.name}</h3><p>{boss.skill}</p><em>狂暴：{boss.enrage}・階段剩餘 {phaseSeconds} 秒</em></div>
      <div className="raid-console">
        <div className="raid-timer"><span>總倒數</span><strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</strong></div>
        <div><div className="raid-label"><span><Swords />{boss.name} HP</span><b>{Math.ceil(hp).toLocaleString()} / {maxHp.toLocaleString()}</b></div><Progress value={Math.max(0, hp / maxHp * 100)} /></div>
        <div><div className="raid-label"><span><Shield />隊伍穩定度</span><b>{Math.ceil(integrity)}%</b></div><Progress value={integrity} className="raid-integrity" /></div>
        <p className="raid-message"><Sparkles />{message}</p>
        <Button className="raid-burst" disabled={status !== "fighting" || !burstReady} onClick={burst}>合擊雷印・爆發傷害</Button>
      </div>
    </section>
    <footer className="raid-loot"><strong>通關保底</strong><span>雷祭印記 ×6</span><span>小型雷之屬性石 ×20</span><span>精氣之珠碎片 ×12</span><span>鹿亞之角 ×1</span></footer>
    <section className="raid-forge"><header><div><small>神仙谷鍛造</small><h3>T10 雷神／神獸套裝</h3><p>青龍 {azureSetPieces}/5：2／3／5 件祭壇傷害 +10／20／35%。蚩尤 {chiyouSetPieces}/5：+12／25／40%。天照 {amaterasuSetPieces}/5：+15／30／45%。</p></div></header><div className="raid-forge-grid">{THUNDER_FORGE_RECIPES.map(recipe => { const canForge = Object.entries(recipe.needs).every(([name, amount]) => (materials[name] || 0) >= amount); const effect=`ATK +${recipe.atk}／DEF +${recipe.def}／HP +${recipe.hp}${recipe.bonus.intel?`／智力 +${recipe.bonus.intel}`:''}${recipe.bonus.str?`／力量 +${recipe.bonus.str}`:''}${recipe.bonus.agi?`／敏捷 +${recipe.bonus.agi}`:''}${recipe.bonus.vit?`／體質 +${recipe.bonus.vit}`:''}`; return <article key={recipe.id}>{recipe.image&&<img className="raid-forge-art" src={recipe.image} alt=""/>}<strong>{recipe.name}</strong><small>{effect}</small><p>{Object.entries(recipe.needs).map(([name, amount]) => <span key={name} className={(materials[name] || 0) >= amount ? "ready" : ""}>{name} {materials[name] || 0}/{amount}</span>)}</p><Button size="sm" disabled={!canForge} onClick={() => onForge(recipe.id)}>鍛造</Button></article>; })}</div></section>
  </section>;
}
