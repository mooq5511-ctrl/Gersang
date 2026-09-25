"use client";

import { useEffect, useState } from "react";
import { BookOpen, Bolt, Crown, Shield, Sparkles, Swords, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { THUNDER_FORGE_RECIPES, type ThunderForgeId } from './mythic-forge';
import "./thunder-altar-raid.css";

type Status = "ready" | "fighting" | "failed" | "cleared";
type Phase = 0 | 1 | 2;

const ENTRY_COST = 50_000;
const BURST_COOLDOWN = 10;
const MECHANIC_SECONDS = 8;
const MAX_COMBAT_LOG_LINES = 6;
const BOSSES = [
  { name: "喵兒", title: "雷影妖姬", time: 240, hp: 5_000_000, skill: "殘影分身：範圍傷害可快速瓦解分身；命中不足時首領閃避提高。", enrage: "千影獵殺" },
  { name: "守護弓手・泰貞", title: "雷弦守護者", time: 240, hp: 8_000_000, skill: "蓄力貫穿箭：以護盾承傷，或使用控場打斷蓄力。", enrage: "萬箭雷鳴" },
  { name: "鹿亞", title: "雷翼獸王", time: 240, hp: 11_000_000, skill: "召喚雷雲與全場雷暴：需要持續治療，最後 30 秒必須全力爆發。", enrage: "末日神罰" },
] as const;
const RECOMMENDED_POWER = [100_000, 160_000, 220_000] as const;

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
  const [burstCooldown, setBurstCooldown] = useState(0);
  const [mechanicSeconds, setMechanicSeconds] = useState(MECHANIC_SECONDS);
  const [combatLog, setCombatLog] = useState<string[]>(["祭壇封印尚未解除。"]);
  const [message, setMessage] = useState("祭壇封印尚未解除。");
  const raidPower = Math.max(1_000, power);
  const recommendedPower = RECOMMENDED_POWER[2];
  const readiness = raidPower >= recommendedPower ? "ready" : raidPower >= RECOMMENDED_POWER[1] ? "caution" : "danger";
  const setBonus=(pieces:number,bonus:[number,number,number])=>pieces>=5?bonus[2]:pieces>=3?bonus[1]:pieces>=2?bonus[0]:0;
  const dps = Math.max(50, Math.floor(raidPower * .25 * (1+setBonus(azureSetPieces,[.1,.2,.35])+setBonus(chiyouSetPieces,[.12,.25,.4])+setBonus(amaterasuSetPieces,[.15,.3,.45]))));
  const publish = (text: string) => {
    setMessage(text);
    setCombatLog((previous) => [text, ...previous].slice(0, MAX_COMBAT_LOG_LINES));
  };

  const finishFailure = (passed: Phase) => {
    const rewards: Record<string, number> = passed === 0 ? { "雷祭印記": 1, "小型雷之屬性石": 3 } : passed === 1 ? { "雷祭印記": 2, "小型雷之屬性石": 6, "喵兒的尾巴": 1 } : { "雷祭印記": 3, "小型雷之屬性石": 10, "喵兒的尾巴": 1, "雷電的箭矢": 1 };
    onRefund();
    onMaterials(gain(materials, rewards));
    setStatus("failed"); publish(`挑戰失敗，退回 25,000 信用值並取得參與獎勵。`);
  };

  const clearRaid = () => {
    const rewards = { "雷祭印記": 6, "小型雷之屬性石": 20, "精氣之珠碎片": 12, "喵兒的尾巴": 2, "雷電的箭矢": 2, "鹿亞之角": 1, "深淵的精髓": 1, "青龍頭盔": 1, "[玉衡]咒術秘訣": 1 };
    onMaterials(gain(materials, rewards));
    setStatus("cleared"); publish("雷霆祭壇已鎮壓，專屬鍛造材料已收入背包。");
  };

  useEffect(() => {
    if (status !== "fighting") return;
    const timer = window.setInterval(() => {
      setSeconds(value => Math.max(0, value - 1));
      setPhaseSeconds(value => Math.max(0, value - 1));
      setHp(value => Math.max(0, value - dps));
      setIntegrity(value => Math.max(0, value - (phase === 0 ? 0.1 : phase === 1 ? 0.15 : 0.2)));
      setBurstCooldown(value => Math.max(0, value - 1));
      setMechanicSeconds(value => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status, dps, phase]);

  useEffect(() => {
    if (status !== "fighting" || mechanicSeconds > 0) return;
    setIntegrity((value) => Math.max(0, value - 8));
    setMechanicSeconds(MECHANIC_SECONDS);
    publish("狂雷爆發命中全場，隊伍穩定度下降 8%。");
  }, [status, mechanicSeconds]);

  useEffect(() => {
    if (status !== "fighting") return;
    if (seconds <= 0 || integrity <= 0) { finishFailure(phase); return; }
    if (hp > 0) return;
    if (phase === 2) { clearRaid(); return; }
    const next = (phase + 1) as Phase;
    setPhase(next); setMaxHp(BOSSES[next].hp); setHp(BOSSES[next].hp); setSeconds(BOSSES[next].time); setPhaseSeconds(BOSSES[next].time);
    setMechanicSeconds(MECHANIC_SECONDS);
    publish(`${BOSSES[phase].name} 已擊破，${BOSSES[next].name} 降臨祭壇。`);
  }, [hp, seconds, integrity, status, phase]);

  const start = () => {
    if (credit < ENTRY_COST) { onNotice("信用值不足，需要 50,000 信用值才能進入雷霆祭壇。"); return; }
    if (raidPower < recommendedPower) onNotice(`目前隊伍戰力 ${raidPower.toLocaleString()}，低於三階段穩定通關建議 ${recommendedPower.toLocaleString()}；仍可挑戰，但失敗風險較高。`);
    onEnter(); setStatus("fighting"); setPhase(0); setMaxHp(BOSSES[0].hp); setHp(BOSSES[0].hp); setSeconds(240); setPhaseSeconds(BOSSES[0].time); setIntegrity(100); setBurstCooldown(0); setMechanicSeconds(MECHANIC_SECONDS); setCombatLog(["雷霆祭壇開啟：喵兒以殘影包圍隊伍。"]); setMessage("雷霆祭壇開啟：喵兒以殘影包圍隊伍。 ");
  };
  const burst = () => {
    if (status !== "fighting" || burstCooldown > 0) return;
    const bonus = Math.floor(dps * (phase === 0 ? 12 : phase === 1 ? 10 : 14));
    setHp(value => Math.max(0, value - bonus)); setBurstCooldown(BURST_COOLDOWN); publish(`合擊雷印命中，造成 ${bonus.toLocaleString()} 點爆發傷害。`);
  };
  const stabilize = () => {
    if (status !== "fighting") return;
    setIntegrity((value) => Math.min(100, value + 8));
    publish("隊伍完成防禦穩定，暫時抵抗雷暴侵蝕。");
  };
  const interrupt = () => {
    if (status !== "fighting") return;
    const damage = Math.floor(dps * 4);
    setHp((value) => Math.max(0, value - damage));
    setMechanicSeconds(MECHANIC_SECONDS);
    publish(`打斷狂雷蓄力成功，造成 ${damage.toLocaleString()} 點傷害。`);
  };
  const teamSkill = () => {
    if (status !== "fighting") return;
    const damage = Math.floor(dps * 5);
    setHp((value) => Math.max(0, value - damage));
    setIntegrity((value) => Math.min(100, value + 12));
    publish(`隊伍技能發動，造成 ${damage.toLocaleString()} 點傷害並恢復隊伍穩定度。`);
  };

  const boss = BOSSES[phase];
  return <section className="thunder-raid" aria-label="神仙谷雷霆祭壇">
    <header className="raid-header"><div><small>神仙谷・特殊高難度副本</small><h2><Bolt />雷霆祭壇</h2><p>連戰三位雷屬性首領，每位首領各限時 240 秒。入場消耗 50,000 信用值，失敗退回 25,000 信用值並保留參與獎勵。</p><div className={`raid-power-advice ${readiness}`}><strong>穩定通關建議戰力・{recommendedPower.toLocaleString()}</strong><span>目前隊伍 {raidPower.toLocaleString()}・{readiness === "ready" ? "適合挑戰" : readiness === "caution" ? "可挑戰但第三階段有風險" : "目前不建議挑戰"}</span><small>門檻：P1 {RECOMMENDED_POWER[0].toLocaleString()}／P2 {RECOMMENDED_POWER[1].toLocaleString()}／P3 {RECOMMENDED_POWER[2].toLocaleString()}</small></div></div><div className="raid-entry"><strong>{credit.toLocaleString()}</strong><span>持有信用值</span><Button disabled={status === "fighting" || credit < ENTRY_COST} onClick={start}><Crown />進入祭壇・50,000</Button></div></header>
    <div className="raid-phases" aria-label="副本階段">{BOSSES.map((item, index) => <article key={item.name} className={index === phase ? "active" : index < phase || status === "cleared" ? "done" : "locked"}><span className="raid-phase-marker">{index < phase || status === "cleared" ? "✓" : index + 1}</span><div><b>階段 {index + 1}</b><strong>{item.name}</strong></div><small>{index === 0 ? "命中／範圍" : index === 1 ? "護盾／控場" : "治療／爆發"}</small></article>)}</div>
    <section className="raid-arena">
      <div className={`raid-boss boss-phase-${phase}`}><div className="raid-boss-art" role="img" aria-label={`${boss.name} 首領圖像`} /><small>{boss.title}・雷屬性</small><h3>{boss.name}</h3><p>{boss.skill}</p><em>狂暴：{boss.enrage}・階段剩餘 {phaseSeconds} 秒</em></div>
      <div className="raid-console">
        <div className="raid-console-header"><div className="raid-timer"><span>本階段倒數</span><strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</strong></div><span className={`raid-status-pill ${status}`}><Users />{status === "fighting" ? "戰鬥中" : status === "cleared" ? "已鎮壓" : status === "failed" ? "挑戰失敗" : "待命"}</span></div>
        <div><div className="raid-label"><span><Swords />{boss.name} HP</span><b>{Math.ceil(hp).toLocaleString()} / {maxHp.toLocaleString()}</b></div><Progress value={Math.max(0, hp / maxHp * 100)} /></div>
        <div><div className="raid-label"><span><Shield />隊伍穩定度</span><b>{Math.ceil(integrity)}%</b></div><Progress value={integrity} className="raid-integrity" /></div>
        <div className="raid-mechanic"><Bolt /><div><small>特殊機制</small><strong>狂雷倒數 <b>{mechanicSeconds}</b> 秒</strong></div><span>歸零時隊伍穩定度 -8%</span></div>
        <p className="raid-message"><Sparkles />{message}</p>
        <section className="raid-combat-log" aria-label="戰鬥紀錄"><header><BookOpen />戰鬥紀錄</header><div>{combatLog.map((entry, index) => <p key={`${entry}-${index}`}><small>[{String(Math.max(0, seconds)).padStart(3, "0")}]</small>{entry}</p>)}</div></section>
        <div className="raid-action-grid" aria-label="戰鬥操作"><Button className="raid-action-focus raid-burst" disabled={status !== "fighting" || burstCooldown > 0} onClick={burst}><Swords />{burstCooldown > 0 ? `集火冷卻 ${burstCooldown} 秒` : "集火攻擊"}</Button><Button className="raid-action-defend" disabled={status !== "fighting"} onClick={stabilize}><Shield />防禦穩定</Button><Button className="raid-action-interrupt" disabled={status !== "fighting"} onClick={interrupt}><Bolt />打斷技能</Button><Button className="raid-action-team" disabled={status !== "fighting"} onClick={teamSkill}><Crown />隊伍技能</Button></div>
      </div>
    </section>
    <footer className="raid-loot"><strong>通關保底</strong><span>雷祭印記 ×6</span><span>小型雷之屬性石 ×20</span><span>精氣之珠碎片 ×12</span><span>鹿亞之角 ×1</span></footer>
    <section className="raid-forge"><header><div><small>神仙谷鍛造</small><h3>T10 雷神／神獸套裝</h3><p>青龍 {azureSetPieces}/5：2／3／5 件祭壇傷害 +10／20／35%。蚩尤 {chiyouSetPieces}/5：+12／25／40%。天照 {amaterasuSetPieces}/5：+15／30／45%。</p></div></header><div className="raid-forge-grid">{THUNDER_FORGE_RECIPES.map(recipe => { const canForge = Object.entries(recipe.needs).every(([name, amount]) => (materials[name] || 0) >= amount); const effect=`ATK +${recipe.atk}／DEF +${recipe.def}／HP +${recipe.hp}${recipe.bonus.intel?`／智力 +${recipe.bonus.intel}`:''}${recipe.bonus.str?`／力量 +${recipe.bonus.str}`:''}${recipe.bonus.agi?`／敏捷 +${recipe.bonus.agi}`:''}${recipe.bonus.vit?`／體質 +${recipe.bonus.vit}`:''}`; return <article key={recipe.id}>{recipe.image&&<img className="raid-forge-art" src={recipe.image} alt=""/>}<strong>{recipe.name}</strong><small>{effect}</small><p>{Object.entries(recipe.needs).map(([name, amount]) => <span key={name} className={(materials[name] || 0) >= amount ? "ready" : ""}>{name} {materials[name] || 0}/{amount}</span>)}</p><Button size="sm" disabled={!canForge} onClick={() => onForge(recipe.id)}>鍛造</Button></article>; })}</div></section>
  </section>;
}
