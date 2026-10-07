import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
import {AVAILABLE_MERCENARY_IDS,isMercenaryAvailable} from '../app/mercenary-availability.ts';
import {merchantMercenaries} from '../app/mercenary-roster.ts';
const source=file=>readFileSync(new URL('../app/'+file,import.meta.url),'utf8');
test('only the existing Korean spearman is available, full roster stays in project',()=>{
 assert.deepEqual(AVAILABLE_MERCENARY_IDS,['spear']);
 assert.deepEqual(merchantMercenaries.filter(spec=>isMercenaryAvailable(spec.id)).map(spec=>spec.name),['朝鮮槍兵']);
 assert.equal(merchantMercenaries.length,19);
 assert.equal(isMercenaryAvailable('general-test'),false);assert.equal(isMercenaryAvailable('shield'),false);
});
test('UI and controller restrict new recruits without resetting player saves',()=>{
 assert.match(source('mercenary-recruitment.tsx'),/filter\(\(\{spec\}\) => isMercenaryAvailable\(spec.id\)\)/);
 const controller=source('game-squad-controller.ts');assert.match(controller,/if \(!isMercenaryAvailable\(spec.id\)\)/);assert.match(controller,/if \(!isMercenaryAvailable\(`general-\$\{general.id\}`\)\)/);
 for(const file of ['use-game-state.ts','hanyang-prologue.ts']){
  const committed=execFileSync('git',['show',`HEAD:app/${file}`],{encoding:'utf8'});
  assert.equal(source(file).replace(/\r\n/g,'\n'),committed.replace(/\r\n/g,'\n'),`${file} must remain unchanged`);
 }
 // Guidance is intentionally evolving and has runtime coverage in
 // first-promotion-objective.test.mjs; it is not a recruitment invariant.
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
