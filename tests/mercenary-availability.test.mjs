import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import vm from 'node:vm';
import {createRequire,Module} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
import {AVAILABLE_MERCENARY_IDS,isMercenaryAvailable} from '../app/mercenary-availability.ts';
import {merchantMercenaries} from '../app/mercenary-roster.ts';
const require=createRequire(import.meta.url);
require.extensions['.css']=()=>{};
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(readFileSync(filename,'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},fileName:filename,
}).outputText,filename);
require.extensions['.tsx']=require.extensions['.ts'];
const source=file=>readFileSync(new URL('../app/'+file,import.meta.url),'utf8');
const {freshGame}=require('../app/game-hero-factory.ts');
const {serializeGameForStorage}=require('../app/game-state.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const {worldCities}=require('../app/v15-data.ts');
let createSquadController;
const resolveOriginal=Module._resolveFilename;
try {
 Module._resolveFilename=function(request,...args) {
  return resolveOriginal.call(this,request.startsWith('@/')?fileURLToPath(new URL('../'+request.slice(2),import.meta.url)):request,...args);
 };
 ({createSquadController}=require('../app/game-squad-controller.ts'));
} finally {
 Module._resolveFilename=resolveOriginal;
}
test('only the existing Korean spearman is available, full roster stays in project',()=>{
 assert.deepEqual(AVAILABLE_MERCENARY_IDS,['spear']);
 assert.deepEqual(merchantMercenaries.filter(spec=>isMercenaryAvailable(spec.id)).map(spec=>spec.name),['朝鮮槍兵']);
 assert.equal(merchantMercenaries.length,19);
 assert.equal(isMercenaryAvailable('general-test'),false);assert.equal(isMercenaryAvailable('shield'),false);
});
test('UI and controller restrict new recruits without resetting player saves',()=>{
 const recruitment=source('mercenary-recruitment.tsx');
 assert.match(recruitment,/merchantMercenaries\.map\(\(spec, index\) => \(\{spec,index\}\)\)\.filter\(\(\{spec\}\) => isMercenaryAvailable\(spec\.id\)\)/);
 assert.match(recruitment,/availableMercenaries\.map\(\(\{spec,index\}\) =>/);
 const controllerSource=source('game-squad-controller.ts');
 assert.match(controllerSource,/if \(!isMercenaryAvailable\(spec\.id\)\)/);
 assert.match(controllerSource,/if \(!isMercenaryAvailable\(`general-\$\{general\.id\}`\)\)/);

 let game={...freshGame('招募限制與存檔保留'),gold:20_000,creditLevel:2,hanyangPrologueStep:'caravan-delivery'};
 let notice='';
 const controller=createSquadController({
  game,currentCity:worldCities.find(city=>city.id===game.city),
  setGame:update=>{game=typeof update==='function'?update(game):update;},
  setNotice:message=>{notice=message;},selectedUid:'hero',
 });
 const beforeRejectedRecruit=game;
 controller.recruitMerchant(merchantMercenaries.find(spec=>spec.id==='shield'),1);
 assert.strictEqual(game,beforeRejectedRecruit);
 assert.equal(game.mercs.length,0);
 assert.match(notice,/傭兵系統調整中/);
 const beforeRejectedGeneral=game;
 controller.recruitGeneral({id:'restricted-general'});
 assert.strictEqual(game,beforeRejectedGeneral);
 assert.match(notice,/傭兵系統調整中/);

 controller.recruitMerchant(merchantMercenaries.find(spec=>spec.id==='spear'),0);
 assert.equal(game.mercs.length,1);
 const available=game.mercs[0];
 const savedShield={...available,uid:'legacy-shield',templateId:'merchant-shield',name:'山城盾衛',level:12,xp:345};
 const savedArcher={...available,uid:'legacy-archer',templateId:'merchant-archer',name:'虎獵弓手',level:15,xp:678};
 game={...game,mercs:[available,savedShield],restingMercs:[savedArcher],active:[available.uid,savedShield.uid],
  hanyangPrologueStep:'caravan-delivery',hanyangPrologueFlags:{...game.hanyangPrologueFlags,caravanCargoDelivered:true}};
 const persistedRoster={
  mercs:game.mercs.map(({uid,templateId,name,level,xp})=>({uid,templateId,name,level,xp})),
  restingMercs:game.restingMercs.map(({uid,templateId,name,level,xp})=>({uid,templateId,name,level,xp})),
  active:[...game.active],gold:game.gold,hanyangPrologueStep:game.hanyangPrologueStep,
  caravanCargoDelivered:game.hanyangPrologueFlags.caravanCargoDelivered,
 };
 const restored=restoreGame(JSON.parse(serializeGameForStorage(game)));
 assert.deepEqual({
  mercs:restored.mercs.map(({uid,templateId,name,level,xp})=>({uid,templateId,name,level,xp})),
  restingMercs:restored.restingMercs.map(({uid,templateId,name,level,xp})=>({uid,templateId,name,level,xp})),
  active:restored.active,gold:restored.gold,hanyangPrologueStep:restored.hanyangPrologueStep,
  caravanCargoDelivered:restored.hanyangPrologueFlags.caravanCargoDelivered,
 },persistedRoster);
});

test('extracted relic equipment scoring preserves the pre-extraction formula',()=>{
 // Pin the actual pre-extraction source: HEAD no longer contains this formula
 // after committing the extraction, and must not silently become the oracle.
 const committed=execFileSync('git',['show','295e370:app/game-progression-view.ts'],{encoding:'utf8'});
 assert.ok(committed.includes('const relicRarityScore'));
 assert.ok(committed.includes('export const relicEquipmentScore'));
 const context=vm.createContext({});
 const original=committed.slice(committed.indexOf('const relicRarityScore'),committed.indexOf('export const FIRST_CARAVAN_QUEST_ID')).replace(/^export /gm,'');
 vm.runInContext(ts.transpileModule(original+'\nglobalThis.score=relicEquipmentScore;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 const {relicEquipmentScore}=createRequire(import.meta.url)('../app/relic-party.ts');
 for(const rarity of ['普通','稀有','史詩','傳說','金色'])for(const enhance of [0,5,10,15])for(const socketGem of [undefined,{id:'gem'}]){
  const unit={equip:{weapon:{rarity,enhance,socketGem},armor:null,ring1:{rarity,enhance,socketGem}}};
  assert.equal(relicEquipmentScore(unit),context.score(unit),'extracted scoring preserves the committed formula');
 }
});
