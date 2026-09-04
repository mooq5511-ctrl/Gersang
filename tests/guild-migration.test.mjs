import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { retainGuildRoster, backupBeforeGuildMigration } from '../app/guild-migration.ts';
const sword={uid:'sword',atk:30}, helm={uid:'helm',def:20};
const member=(uid,templateId,equip={})=>({uid,templateId,equip,level:40,hp:123,mp:12,xp:88,points:9});
const state=()=>({gold:321,stage:12,hero:{uid:'hero',equip:{helm}},mercs:[member('old','korea-1',{weapon:sword}),member('guild','merchant-spear')],active:['old','guild'],inventory:[],logs:[],trade:{totalProfit:999}});
test('only known guild mercenaries survive; gear returns and other progress stays',()=>{
  const original=state(),before=JSON.stringify(original),next=retainGuildRoster(original);
  assert.deepEqual(next.mercs,[original.mercs[1]]);assert.deepEqual(next.active,['guild']);
  assert.deepEqual(next.inventory,[sword]);assert.equal(next.hero,original.hero);
  assert.equal(next.gold,321);assert.equal(next.stage,12);assert.equal(next.trade,original.trade);
  assert.equal(JSON.stringify(original),before);
});
test('migration is idempotent without duplicate refunds',()=>{
  const once=retainGuildRoster(state());assert.deepEqual(retainGuildRoster(once),once);
});
test('gear already owned by surviving characters is not duplicated',()=>{
  const s=state();s.inventory=[sword];s.mercs[0].equip.helm=helm;
  const next=retainGuildRoster(s);assert.deepEqual(next.inventory,[sword]);assert.equal(next.hero.equip.helm,helm);
});
test('empty roster valid; unknown and legacy merchant IDs are removed',()=>{
  const s=state();s.mercs=[member('old','merchant-legacy-0'),member('fake','merchant-unknown')];s.active=['old','fake','ghost'];
  const next=retainGuildRoster(s);assert.deepEqual(next.mercs,[]);assert.deepEqual(next.active,[]);
});
test('guild stats, gear and deployment choices are preserved',()=>{
  const s=state();s.mercs[1].equip={weapon:helm};s.active=['guild','guild','ghost','old'];
  const next=retainGuildRoster(s);assert.equal(next.mercs[0],s.mercs[1]);assert.deepEqual(next.active,['guild']);
  assert.equal(next.mercs[0].hp,123);assert.equal(next.mercs[0].mp,12);
});
test('backup captures original slot once and never overwrites it',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  const raw=JSON.stringify(state());backupBeforeGuildMigration(storage,'slot',raw);
  assert.equal(data.get('slot:before-guild-only'),raw);
  backupBeforeGuildMigration(storage,'slot',JSON.stringify({...state(),gold:1}));
  assert.equal(data.get('slot:before-guild-only'),raw);
  backupBeforeGuildMigration(storage,'clean',JSON.stringify(retainGuildRoster(state())));
  assert.equal(data.has('clean:before-guild-only'),false);
});
test('failed backup aborts destructive migration',()=>{
  const storage={getItem:()=>null,setItem:()=>{throw new Error('storage full');}};
  assert.throws(()=>backupBeforeGuildMigration(storage,'slot',JSON.stringify(state())),/storage full/);
});
test('game removes legacy recruitment and evolution entrypoints and migrates loaded saves',()=>{
  const source=readFileSync(new URL('../app/game-v15.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/value="fusion"|function promoteSelected|function specialFusion|function awakenSelected|function legendFusion|function recruit\(template|makeBaseUnit|currentGenerals|currentMercenaries|特約傭兵/);
  assert.match(source,/中央傭兵公會/);
  assert.match(source,/return retainGuildRoster<Equipment, Unit, GameState>\(next\)/);
  assert.match(source,/backupBeforeGuildMigration\(localStorage/);
  assert.match(source,/const starters: Unit\[\] = \[\]/);
  const recruitment=readFileSync(new URL('../app/mercenary-recruitment.tsx',import.meta.url),'utf8');
  assert.match(recruitment,/中央傭兵公會・16 種傭兵/);
  assert.doesNotMatch(recruitment,/特約|原有傭兵保留/);
});
