import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {officialGems}=require('../app/v17-content.ts');
const {socketGemAction}=require('../app/game-inventory-actions.ts');
const {combatStats,vitalStats}=require('../app/vitals-engine.ts');
const {unitPower}=require('../app/game-progression.ts');
const {isSocketGemDisplayAffix}=require('../app/equipment-affix-semantics.ts');
const {serializeGameForStorage}=require('../app/game-state.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const addLog=(logs,message)=>[message,...logs];

test('all actual gem recipes apply their flat value once, before and after storage',()=>{
  for(const gem of officialGems) for(let grade=0;grade<3;grade++) for(const count of [1,100]) {
    const game=freshGame('寶石單位測試');
    game.gold=gem.costs[grade]*count;
    game.hero.equip.weapon={uid:'gem-test',name:'測試武器',slot:'weapon',atk:10,def:5,hp:20,enhance:0,rarity:'普通',image:'',magic:[],bonus:{str:0,agi:0,intel:0,vit:0}};
    const updated=socketGemAction(game,'hero','weapon',gem.id,grade,count,addLog,()=>{});
    const expected=structuredClone(updated.hero);
    // Removing presentation-only socket lines must never remove or amplify combat power.
    expected.equip.weapon.magic=[];
    assert.deepEqual(combatStats(updated.hero),combatStats(expected));
    assert.deepEqual(vitalStats(updated.hero),vitalStats(expected));
    assert.equal(unitPower(updated.hero),unitPower(expected));
    const value=gem.values[grade]*count;
    for(const stat of ['str','agi','vit','intel']) assert.equal(updated.hero.equip.weapon.bonus[stat],gem.stat==='all'||gem.stat===stat?value:0);
    const restored=restoreGame(JSON.parse(serializeGameForStorage(updated)));
    assert.deepEqual(combatStats(restored.hero),combatStats(expected));
    assert.equal(vitalStats(restored.hero).maxHp,vitalStats(expected).maxHp);
    assert.equal(vitalStats(restored.hero).maxMp,vitalStats(expected).maxMp);
    assert.equal(unitPower(restored.hero),unitPower(expected));
  }
});

test('real percent affixes coexist with flat gems and are not suppressed by name or stat',()=>{
  const game=freshGame('真實百分比');
  const base={uid:'flat',name:'武器',slot:'weapon',atk:10,def:0,hp:0,enhance:0,rarity:'普通',image:'',bonus:{str:15,agi:0,vit:0,intel:0},socketGem:{id:'obsidian'},magic:[]};
  game.hero.equip.weapon=base;
  const flat=combatStats(game.hero).attack;
  const percent={id:'power',stat:'str',value:10};
  game.hero.equip.weapon={...base,magic:[{id:'socket-obsidian',stat:'str',value:15},percent]};
  const withPercent=combatStats(game.hero).attack;
  assert.ok(withPercent>flat);
  game.hero.equip.weapon={...base,magic:[percent]};
  assert.equal(combatStats(game.hero).attack,withPercent);
  assert.equal(isSocketGemDisplayAffix(base,percent),false);
  assert.equal(isSocketGemDisplayAffix({}, {id:'socket-obsidian'}),false);
  assert.equal(isSocketGemDisplayAffix(base,{id:'socket-other'}),false);
});

test('promotion mercenary gems also avoid interpreting flat strength/vitality as percentages',()=>{
  const unit={templateId:'merchant-spear',level:72,promotionStage:5,tier:3,str:40,vit:40,agi:24,intel:10,equip:{}};
  const item={atk:10,def:5,hp:20,bonus:{str:150,vit:150},socketGem:{id:'x'},magic:[{id:'socket-x',stat:'str',value:150}]};
  const decorated={...unit,equip:{weapon:item}},flat={...unit,equip:{weapon:{...item,magic:[]}}};
  assert.deepEqual(combatStats(decorated),combatStats(flat));
  assert.deepEqual(vitalStats(decorated),vitalStats(flat));
});
