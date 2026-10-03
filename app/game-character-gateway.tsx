"use client";
import { Button } from "@/components/ui/button";
import { Crown,Play,Sparkles } from "lucide-react";
import { STARTER_NATION,STARTER_VILLAGE_NAME,heroPortrait } from "./game-hero-factory";
import type { GameViewModel } from './use-game-controller';

type Props = Pick<GameViewModel, "activeSlot" | "characterGender" | "characterName" | "confirmDeleteCharacter" | "createCharacter" | "creatorSlot" | "deleteCandidate" | "deleteConfirmName" | "enterCharacter" | "loginEntered" | "notice" | "profiles" | "ready" | "setActiveSlot" | "setCharacterGender" | "setCharacterName" | "setCreatorSlot" | "setDeleteCandidate" | "setDeleteConfirmName" | "setLoginEntered" | "setNotice">;

export function GameCharacterGateway({ activeSlot, characterGender, characterName, confirmDeleteCharacter, createCharacter, creatorSlot, deleteCandidate, deleteConfirmName, enterCharacter, loginEntered, notice, profiles, ready, setActiveSlot, setCharacterGender, setCharacterName, setCreatorSlot, setDeleteCandidate, setDeleteConfirmName, setLoginEntered, setNotice }: Props) {
if (!ready) return <div className="game-loading">正在整理四國角色欄位…</div>;
if (!loginEntered) {
    return <main className="login-splash-screen">
      <button type="button" className="login-splash-enter" onClick={() => { setActiveSlot(null); setCreatorSlot(null); setLoginEntered(true); }} aria-label="進入角色選擇">
        <img src="/game-assets/login-splash.jpg" alt="巨商角色群像" />
        <span>點擊畫面進入</span>
      </button>
    </main>;
  }
if (activeSlot === null) {
    return (
      <main className="character-select-screen">
        <section className="character-select-shell">
          <div className="character-select-heading">
            <div className="brand-seal">商</div>
            <div><small>放置 RPG × 東方商路</small><h1>放置你的巨商魂</h1></div>
          </div>
          {notice && <button className="notice" onClick={() => setNotice("")}><Sparkles />{notice}<span>點擊關閉</span></button>}
          <div className="character-slot-grid">
            {[0, 1, 2].map((slot) => {
              const profile = profiles[slot];
              return profile ? (
                <article className="character-slot occupied" key={slot} style={{ "--nation-color": '#b78a4e' } as React.CSSProperties}>
                  <span className="slot-number">角色欄位 {slot + 1}</span>
                  <img src={heroPortrait(STARTER_NATION, profile.gender)} alt={profile.name} />
                  <div><small>新手村商隊・{profile.gender === 'female' ? '女性主角' : '男性主角'}</small><h2>{profile.name}</h2><p>Lv.{profile.level}・世界地圖進度</p><em>出生地・{STARTER_VILLAGE_NAME}</em></div>
                  <div className="character-slot-actions"><Button onClick={() => enterCharacter(slot)}><Play />進入遊戲</Button><button type="button" className="character-delete-button" onClick={() => { setDeleteCandidate({ slot, name: profile.name }); setDeleteConfirmName(""); }}>刪除角色</button></div>
                </article>
              ) : (
                <article className="character-slot empty" key={slot}>
                  <span className="slot-number">角色欄位 {slot + 1}</span>
                  <div className="empty-slot-mark"><Crown /></div>
                  <div><h2>尚未建立角色</h2><p>從新手村出發，建立新的商團主角。</p></div>
                  <Button variant="outline" onClick={() => { setCreatorSlot(slot); setCharacterName(""); setCharacterGender("male"); }}>建立角色</Button>
                </article>
              );
            })}
          </div>

          {creatorSlot !== null && (
            <section className="character-creator">
              <div className="panel-title"><Crown /><h2>建立角色・欄位 {creatorSlot + 1}</h2><span>出生地・{STARTER_VILLAGE_NAME}</span></div>
              <label className="character-name-field"><span>角色名稱</span><input maxLength={12} value={characterName} onChange={(event) => setCharacterName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createCharacter(); }} placeholder="輸入 1～12 個字" /></label>
              <div className="creator-genders" aria-label="選擇性別"><Button type="button" variant={characterGender === "male" ? "default" : "outline"} onClick={() => setCharacterGender("male")}>男性主角</Button><Button type="button" variant={characterGender === "female" ? "default" : "outline"} onClick={() => setCharacterGender("female")}>女性主角</Button></div>
              <div className="creator-origin"><img src={heroPortrait(STARTER_NATION, characterGender)} alt="" /><span><strong>{STARTER_VILLAGE_NAME}</strong><small>第一份商隊委託，從清出港口驛路開始。</small></span></div>
              <div className="creator-actions"><Button variant="outline" onClick={() => setCreatorSlot(null)}>取消</Button><Button onClick={createCharacter}><Sparkles />建立並開始</Button></div>
            </section>
          )}
          {deleteCandidate && <section className="character-delete-confirm" aria-label="確認刪除角色"><div className="panel-title"><Sparkles /><h2>確認刪除角色</h2></div><p>此操作會刪除角色的等級、任務、裝備、傭兵與所有存檔，且無法復原。</p><label className="character-name-field"><span>請輸入「{deleteCandidate.name}」以確認</span><input autoFocus value={deleteConfirmName} onChange={event => setDeleteConfirmName(event.target.value)} onKeyDown={event => { if (event.key === "Enter") confirmDeleteCharacter(); }} placeholder={deleteCandidate.name} /></label><div className="creator-actions"><Button variant="outline" onClick={() => { setDeleteCandidate(null); setDeleteConfirmName(""); }}>取消</Button><Button variant="destructive" onClick={confirmDeleteCharacter}>永久刪除</Button></div></section>}
        </section>
      </main>
    );
  }
return null;
}
