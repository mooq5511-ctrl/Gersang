import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {measureRelicBridge} from '../scripts/audit-relic-growth-bridge.mjs';
const require=createRequire(import.meta.url);
const {RELIC_BOSS_IDS,RELIC_DUNGEON_MONSTERS,ORIGINAL_RELIC_DUNGEON_MONSTERS}=require('../data/monsters/relic-dungeon-monsters.ts');
const {relicDropEquipmentLevel}=require('../app/relic-equipment-rewards.ts');

test('four real relic bosses match V1 growth without replacing their identities or legacy baseline',()=>{
  const levels=[24,40,56,72];
  RELIC_BOSS_IDS.forEach((id,index)=>{
    const boss=RELIC_DUNGEON_MONSTERS[id],original=ORIGINAL_RELIC_DUNGEON_MONSTERS[id];
    assert.equal(boss.level,levels[index]);
    assert.equal(relicDropEquipmentLevel(id),boss.level);
    for(const key of ['id','name','skill','description','drop'])assert.deepEqual(boss[key],original[key]);
    assert.ok(boss.hp<original.hp);
    if(index)assert.ok(boss.hp>RELIC_DUNGEON_MONSTERS[RELIC_BOSS_IDS[index-1]].hp);
  });
  assert.equal(ORIGINAL_RELIC_DUNGEON_MONSTERS.relic_sunken_king.hp,884760);
});

test('starter and unpromoted teams cannot clear the first boss without growth',()=>{
  for(const gear of ['empty','live'])assert.equal(measureRelicBridge({level:12,count:2,gear}).status,'defeated');
  for(const level of [12,20,24,30])assert.equal(measureRelicBridge({level,count:3,rank:1}).status,'defeated');
});

test('both promotion paths can clear each real floor with an appropriately grown ordinary equipped team',()=>{
  for(const floor of [0,1,2,3])for(const branch of ['spear','bow']){
    const row=measureRelicBridge({floor,level:[24,40,56,72][floor],count:3,branch});
    assert.equal(row.status,'cleared',JSON.stringify(row));
    assert.ok(row.turns>=12&&row.turns<=20);
    assert.ok(row.hpFraction>0&&row.hpFraction<.3);
  }
});
