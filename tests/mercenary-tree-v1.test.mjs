import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},fileName:filename}).outputText,filename);
require.extensions['.tsx']=require.extensions['.ts'];
require.extensions['.css']=()=>{};
const {promoteMercenaryV1}=require('../app/mercenary-promotion-v1.ts');
const {BOW_TEMPLATE,MERCENARY_STAGES,getMercenaryStats,nextPromotion}=require('../app/mercenary-growth-v1.ts');
const {merchantMercenaries,mercenarySpec}=require('../app/mercenary-roster.ts');
const {freshGame}=require('../app/game-hero-factory.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const {grantXp}=require('../app/game-progression.ts');
const {vitalStats,combatStats}=require('../app/vitals-engine.ts');
const {sealForStage,rollWarSeal,awardWarSeal,claimPendingWarSeals,ALL_WAR_SEALS}=require('../app/war-seals.ts');
const spec=merchantMercenaries[0];
const recruit=()=>({uid:'tree-unit',templateId:'merchant-spear',name:'朝鮮槍兵',tier:1,promotionStage:1,level:12,xp:777,points:3,str:spec.ratings[1],vit:spec.ratings[0],agi:spec.ratings[3],intel:10,equip:{},hp:300,mp:40,role:spec.role,skill:spec.active,position:'中排',image:''});
const initial=()=>({...freshGame('兵種樹測試'),mercs:[recruit()],active:['tree-unit'],materials:Object.fromEntries(ALL_WAR_SEALS.map(s=>[s.name,2]))});
test('Lv12 chooses a single paid route; no cross-route or duplicate promotion',()=>{
 for(const branch of ['spear','bow']){const before=initial(),snapshot=JSON.stringify(before),after=promoteMercenaryV1(before,'tree-unit',2,branch),u=after.mercs[0];assert.equal(JSON.stringify(before),snapshot);assert.equal(u.name,branch==='bow'?'長弓兵':'長槍兵');assert.equal(u.templateId,branch==='bow'?BOW_TEMPLATE:'merchant-spear');assert.equal(u.position,branch==='bow'?'後排':'前排');assert.equal(u.xp,777);assert.equal(u.level,12);assert.equal(u.points,3);assert.equal(u.equip,before.mercs[0].equip);assert.equal(after.materials[sealForStage(2,branch).name],1);assert.equal(after.materials[sealForStage(2,branch==='bow'?'spear':'bow').name],2);assert.deepEqual(promoteMercenaryV1(after,'tree-unit',2,branch).materials,after.materials);const switchAttempt=promoteMercenaryV1({...after,mercs:[{...u,level:36}]},u.uid,3,branch==='bow'?'spear':'bow');assert.equal(switchAttempt.mercs[0].templateId,u.templateId);assert.deepEqual(switchAttempt.materials,after.materials);assert.ok(after.battleLogs.some(l=>l.message.includes(branch==='bow'?'弓兵路線':'槍兵路線')));}
});
test('wrong token, underlevel and busy choices retain both routes and all tokens',()=>{
 for(const edit of [s=>s.materials['長弓兵符']=0,s=>s.mercs[0].level=11,s=>s.dungeon={status:'fighting'},s=>s.relicDungeon={status:'boss'}]){const s=initial();edit(s);const result=promoteMercenaryV1(s,'tree-unit',2,'bow');assert.equal(result.mercs,s.mercs);assert.deepEqual(result.materials,s.materials);}
 const s=initial();assert.deepEqual(promoteMercenaryV1(s,'tree-unit',2,'invalid').materials,s.materials);
});
test('bow follows all seven gates with unchanged XP caps, multiplier continuity and final compounding',()=>{
 let s=initial();for(const stage of MERCENARY_STAGES.slice(1)){s.mercs[0].level=stage.minLevel;s=promoteMercenaryV1(s,'tree-unit',stage.stage,'bow');const u=s.mercs[0];assert.equal(u.promotionStage,stage.stage);assert.equal(u.xp,777);assert.equal(combatStats(u).attack,getMercenaryStats(u.level,stage.stage,'bow').atk);assert.equal(vitalStats(u).maxHp,getMercenaryStats(u.level,stage.stage,'bow').hp);assert.equal(grantXp(u,1e15).level,nextPromotion(u)?.minLevel||250);}
 assert.ok(getMercenaryStats(250,8,'bow').atk>getMercenaryStats(212,8,'bow').atk);assert.equal(getMercenaryStats(11,1,'bow').hp,300);
});
test('bow is genuinely ranged with archer skills and a distinct existing portrait',()=>{
 const {MercenaryRealtimeBattleSystem}=require('../app/mercenary-realtime-battle.js'),{mercenaryCardArt}=require('../app/mercenary-portrait-art.ts');
 const u=promoteMercenaryV1(initial(),'tree-unit',2,'bow').mercs[0],spear=promoteMercenaryV1(initial(),'tree-unit',2,'spear').mercs[0];
 assert.ok(combatStats(u).attack>combatStats(spear).attack);assert.ok(vitalStats(u).maxHp<vitalStats(spear).maxHp);assert.ok(combatStats(u).defense<combatStats(spear).defense);assert.equal(mercenarySpec(u.templateId).id,'archer');assert.equal(mercenarySpec(u.templateId).ranged,true);assert.match(mercenaryCardArt(u),/archer\.jpg$/);
 const runtime=new MercenaryRealtimeBattleSystem([{id:u.uid,side:'player',templateId:u.templateId,hp:225,maxHp:225,atk:52,def:15,mp:40,maxMp:40,attackInterval:1,ranged:true,position:{row:2,col:0}}],[{id:'healthy',side:'enemy',hp:100,maxHp:100,atk:1,def:0,position:{row:0,col:0}},{id:'wounded',side:'enemy',hp:20,maxHp:100,atk:1,def:0,position:{row:2,col:0}}],{autoSkill:true});
 assert.equal(runtime.players[0].spec.id,'archer');assert.equal(runtime.skillTargets(runtime.players[0])[0].id,'wounded');
 runtime.startBattle();runtime.update(.1);assert.ok(runtime.snapshot().events.some(e=>e.actorId===u.uid&&e.skillName==='穿林重箭'));
});
test('total rank drop chance is retained; selection yields corresponding complete bow seals',()=>{
 for(const [id,rank,rate]of [['e_raccoon',2,.03],['e_amakusa',3,.02]]){assert.equal(rollWarSeal(id,0,'world',.4999).name,sealForStage(rank,'spear').name);assert.equal(rollWarSeal(id,0,'world',.5).name,sealForStage(rank,'bow').name);assert.equal(rollWarSeal(id,rate,'world',.5),undefined);}
 const full=awardWarSeal({materials:{皮革:1},logs:[]},'長弓兵符',1);assert.equal(full.pendingWarSeals['長弓兵符'],1);assert.equal(claimPendingWarSeals(full,2).materials['長弓兵符'],1);
});
test('real save restore retains bow identity, stats and pending tokens; old spears remain spears',()=>{
 const s=promoteMercenaryV1(initial(),'tree-unit',2,'bow');s.pendingWarSeals={'強弓兵符':3};const restored=restoreGame(JSON.parse(JSON.stringify(s)));assert.equal(restored.mercs[0].templateId,BOW_TEMPLATE);assert.equal(restored.mercs[0].promotionStage,2);assert.equal(restored.materials['強弓兵符'],5);assert.equal(restored.mercs[0].xp,777);
 const old=initial();old.mercs[0].promotionStage=4;old.mercs[0].level=60;const unchanged=restoreGame(JSON.parse(JSON.stringify(old)));assert.equal(unchanged.mercs[0].templateId,'merchant-spear');assert.equal(unchanged.mercs[0].promotionStage,4);
});
test('rendered tree offers both choices at rank1 and only the selected route afterwards',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{MercenaryPromotionPanelV1}=require('../app/mercenary-promotion-panel-v1.tsx');
 const render=s=>renderToStaticMarkup(React.createElement(MercenaryPromotionPanelV1,{unit:s.mercs[0],materials:s.materials,promote:()=>{},allocate:()=>{}}));
 const start=render(initial());assert.ok(start.includes('轉職為長槍兵'));assert.ok(start.includes('轉職為長弓兵'));assert.ok(start.includes('來源未開放'));
 const bow=promoteMercenaryV1(initial(),'tree-unit',2,'bow');bow.mercs[0].level=36;const html=render(bow);assert.ok(html.includes('轉職為強弓兵'));assert.ok(!html.includes('轉職為鐵騎兵'));assert.ok(html.includes('強弓兵符'));
});
