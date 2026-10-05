import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import '../scripts/measure-equipment-early.mjs';
import { previewEquipmentConversion, collectEquipmentOccurrences } from '../app/equipment-conversion-preview.ts';
const item = (uid = 'old') => ({ uid, name: '金色・舊刀', slot: 'weapon', atk: 9000, def: 0, hp: 0, rarity: '金色', enhance: 15, source: '既有投資', luckyValue: 80 });
const binding = (uid = 'old') => ({ uid, definitionId: 'confirmed-series-20-weapon', level: 20, part: 'weapon' });
const require = createRequire(import.meta.url);
test('preview preserves all original data and +15/quality, with no mutation or automatic application', () => {
  const input = [{ location: 'hero.weapon', item: item() }], before = JSON.stringify(input);
  const rows = previewEquipmentConversion(input, [binding()]);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(rows[0].original, input[0].item);
  assert.equal(rows[0].retainedEnhance, 15);
  assert.equal(rows[0].retainedQuality, '金色');
  assert.ok(rows[0].delta.atk < 0);
  rows[0].original.atk = 0;
  assert.equal(input[0].item.atk, 9000);
});
test('real save serialization and restore retain old invested equipment; preview never changes the save', () => {
  const { freshGame } = require('../app/game-hero-factory.ts');
  const { serializeGameForStorage } = require('../app/game-state.ts');
  const { restoreGame } = require('../app/game-profile-storage.ts');
  const gear = { ...item(), image:'', magic:[], requiredLevel:1, bonus:{str:0,agi:0,intel:0,vit:0}, resist:{physical:0,magic:0}, socketGem:{id:'test-gem',name:'留存寶石',count:5,totalValue:10,baseName:'留存寶石'} };
  const game = freshGame('舊裝讀檔測試');
  game.hero.equip.weapon = gear;
  game.inventory = [{...gear,uid:'old-in-bag'}];
  game.hero.equip.ring2 = {...gear,uid:'old-ring2',slot:'ring'};
  const companion = { ...game.hero, uid:'save-merc', templateId:'merchant-spear', tier:1, jobClass:'新手槍兵', equip:{...game.hero.equip,weapon:{...gear,uid:'old-merc'}} };
  game.mercs = [companion];
  game.active = [companion.uid];
  game.restingMercs = [{...companion,uid:'save-rest',equip:{...companion.equip,weapon:{...gear,uid:'old-rest'}}}];
  const saved = serializeGameForStorage(game), restored = restoreGame(JSON.parse(saved));
  for (const restoredItem of [restored.hero.equip.weapon, restored.hero.equip.ring2, restored.mercs[0].equip.weapon, restored.restingMercs[0].equip.weapon, restored.inventory[0]]) {
    for (const field of ['atk','def','hp','enhance','rarity','luckyValue','socketGem','source']) assert.deepEqual(restoredItem[field],gear[field]);
  }
  const restoredBefore = JSON.stringify(restored);
  previewEquipmentConversion(collectEquipmentOccurrences(restored),[binding()]);
  assert.equal(JSON.stringify(restored),restoredBefore);
  assert.equal(JSON.parse(saved).hero.equip.weapon.atk,9000);
});

test('socket metadata is restored without duplicating baked bonuses and invalid metadata is safely ignored', () => {
  const { sanitizeEquip } = require('../app/game-save-normalizers.ts');
  const gem = {id:'gem',name:'寶石',baseName:'舊刀',count:100,totalValue:250};
  const gear = {...item(),socketGem:gem,bonus:{str:250,agi:0,intel:0,vit:0},magic:[{id:'socket-gem',stat:'str',value:250}]};
  const once = sanitizeEquip({weapon:gear}), twice = sanitizeEquip(once);
  assert.deepEqual(twice.weapon,once.weapon);
  assert.deepEqual(once.weapon.bonus,gear.bonus);
  assert.deepEqual(once.weapon.magic,gear.magic);
  assert.deepEqual(once.weapon.socketGem,gem);
  assert.notEqual(once.weapon.socketGem,gem);
  for (const socketGem of [undefined,null,'gem',{}, {...gem,count:-1},{...gem,count:1.5},{...gem,totalValue:NaN},{...gem,id:2}]) {
    const restored = sanitizeEquip({weapon:{...gear,socketGem}}).weapon;
    assert.equal(restored.socketGem,undefined);
    assert.equal(restored.atk,gear.atk);
    assert.deepEqual(restored.bonus,gear.bonus);
  }
});

test('actual inlay then reload retains its 100-gem cap, bonus and original name', () => {
  const {freshGame}=require('../app/game-hero-factory.ts');
  const {officialGems}=require('../app/v17-content.ts');
  const {socketGemAction}=require('../app/game-inventory-actions.ts');
  const {serializeGameForStorage}=require('../app/game-state.ts');
  const {restoreGame}=require('../app/game-profile-storage.ts');
  const gem=officialGems[0],game=freshGame('鑲嵌持久化');
  game.gold=gem.costs[0]*101;
  game.hero.equip.weapon={...item(),image:'',magic:[],bonus:{str:0,agi:0,intel:0,vit:0}};
  const addLog=(logs,message)=>[message,...logs];
  const inlaid=socketGemAction(game,'hero','weapon',gem.id,0,100,addLog,()=>{});
  const restored=restoreGame(JSON.parse(serializeGameForStorage(inlaid)));
  assert.deepEqual(restored.hero.equip.weapon.socketGem,inlaid.hero.equip.weapon.socketGem);
  assert.deepEqual(restored.hero.equip.weapon.bonus,inlaid.hero.equip.weapon.bonus);
  assert.deepEqual(restored.hero.equip.weapon.magic,inlaid.hero.equip.weapon.magic);
  assert.equal(restored.hero.equip.weapon.socketGem.baseName,game.hero.equip.weapon.name);
  assert.equal(socketGemAction(restored,'hero','weapon',gem.id,0,1,addLog,()=>{}),restored);
});
test('collector covers inventory, both mercenary rosters, worn ring2 and separate shared warehouse without truncation', () => {
  const snapshot = { inventory: Array.from({length:200},(_,index)=>item(`bag-${index}`)),
    hero:{uid:'hero',equip:{weapon:item('hero-w'),ring2:item('hero-ring')}},
    mercs:[{uid:'merc',equip:{weapon:item('merc-w')}}], restingMercs:[{uid:'rest',equip:{weapon:item('rest-w')}}] };
  const warehouse = [item('warehouse')], before = JSON.stringify({snapshot,warehouse});
  const entries = collectEquipmentOccurrences(snapshot,warehouse);
  assert.equal(entries.length,205);
  assert.ok(entries.some(entry=>entry.location==='hero.hero.ring2'));
  assert.ok(entries.some(entry=>entry.location==='restingMercs.rest.weapon'));
  assert.ok(entries.some(entry=>entry.location==='sharedWarehouse[0]'));
  assert.ok(previewEquipmentConversion(entries,[]).every(row=>row.status==='retained'));
  assert.equal(JSON.stringify({snapshot,warehouse}),before);
});
test('unknown definitions, same-name items, duplicate UIDs and conflicting bindings stay intact', () => {
  assert.equal(previewEquipmentConversion([{ location: 'inventory', item: item() }], [])[0].status, 'retained');
  assert.ok(previewEquipmentConversion([{ location: 'inventory', item: item() }, { location: 'warehouse', item: item() }], [binding()]).every(row => row.status === 'retained'));
  assert.equal(previewEquipmentConversion([{ location: 'inventory', item: item() }], [binding(), binding()])[0].status, 'retained');
  const rows = previewEquipmentConversion([{ location: 'inventory', item: item('a') }, { location: 'resting.weapon', item: item('b') }], [binding('a')]);
  assert.equal(rows[0].status, 'ready-for-core-review');
  assert.equal(rows[1].status, 'retained');
});
test('special effects and malformed/mismatched targets cannot silently become plain equipment', () => {
  const gear = { ...item(), magic: [{ stat: 'atk', value: 1000 }], socketGem: { id: 'x', count: 50 }, skill: '獨有效果' };
  const row = previewEquipmentConversion([{ location: 'merc.weapon', item: gear }], [binding()])[0];
  assert.equal(row.status, 'core-preview-only');
  assert.deepEqual(row.original, gear);
  for (const patch of [{ level: 251 }, { part: 'armor' }, { definitionId: '' }]) {
    assert.equal(previewEquipmentConversion([{ location: 'inventory', item: item() }], [{ ...binding(), ...patch }])[0].status, 'retained');
  }
});
