import test from 'node:test';
import assert from 'node:assert/strict';
import { draftWholeSetBudget, curveDraftEquipment, curveDraftFullEquipment } from '../app/equipment-curve-draft.ts';
import { EARLY_EQUIPMENT_DRAFT } from '../app/equipment-balance-draft.ts';
import { curveFixture, measureCurve } from '../scripts/measure-equipment-curve.mjs';

test('full curve preserves calibrated anchors and monotonically covers every level 1–250', () => {
  for (const anchor of EARLY_EQUIPMENT_DRAFT) assert.deepEqual(draftWholeSetBudget(anchor.level), { atk: anchor.atk, def: anchor.def, hp: anchor.hp });
  let previous, previousItems;
  for (let level = 1; level <= 250; level++) {
    const budget = draftWholeSetBudget(level), items = curveDraftEquipment(level);
    for (const stat of ['atk', 'def', 'hp']) {
      assert.equal(items.reduce((sum, item) => sum + item[stat], 0), budget[stat]);
      if (previous) assert.ok(budget[stat] >= previous[stat]);
      if (previousItems) items.forEach((item, index) => assert.ok(item[stat] >= previousItems[index][stat], `${level} ${item.part} ${stat}`));
    }
    previous = budget;
    previousItems = items;
  }
  for (const level of [0, 251, 1.5, NaN]) assert.throws(() => draftWholeSetBudget(level), RangeError);
});
test('fixed gear does not adapt to wearer level, and candidate multiplier is baked exactly once', () => {
  assert.deepEqual(curveFixture(212, 'spear', 'candidate', 35).units[0].equip, curveFixture(250, 'spear', 'candidate', 35).units[0].equip);
  const ordinary = curveDraftEquipment(212), gold = curveDraftEquipment(212, '金色', 15);
  gold.forEach((item, index) => {
    assert.equal(item.enhance, 0);
    for (const stat of ['atk', 'def', 'hp']) assert.equal(item[stat], ordinary[index][stat] * 4);
  });
});
test('shared candidate equipment retains bow attack advantage and spear survivability at every promotion', () => {
  for (const level of [12, 36, 56, 72, 112, 162, 212, 250]) {
    const spear = curveFixture(level, 'spear', 'candidate').party[1], bow = curveFixture(level, 'bow', 'candidate').party[1];
    assert.ok(bow.attack > spear.attack);
    assert.ok(spear.defense > bow.defense);
    assert.ok(spear.maxHp > bow.maxHp);
  }
});
test('full-curve trial uses real monster and full party-size enemy encounter, reproducibly', () => {
  const result = measureCurve(36, 'e_japan_sea_bat', 'mixed', 'candidate', 3);
  assert.deepEqual(result, measureCurve(36, 'e_japan_sea_bat', 'mixed', 'candidate', 3));
  assert.equal(result.fights[0].enemyCount, 4);
  assert.equal(result.stats.length, 4);
  assert.equal(result.requestedEncounters, 1);
  assert.throws(() => curveFixture(1, 'bow', 'candidate'), RangeError);
  assert.throws(() => curveFixture(36, 'spear', 'candidate', 56), RangeError);
});
test('partial equipment fixtures do not accidentally grant full-set stats', () => {
  const empty = curveFixture(162, 'mixed', 'empty'), weapon = curveFixture(162, 'mixed', 'candidate', 162, '普通', 0, ['weapon']);
  weapon.units.forEach(unit => assert.deepEqual(Object.keys(unit.equip), ['weapon']));
  weapon.party.forEach((unit, index) => {
    assert.equal(unit.defense, empty.party[index].defense);
    assert.equal(unit.maxHp, empty.party[index].maxHp);
    assert.ok(unit.attack > empty.party[index].attack);
  });
  assert.throws(() => curveFixture(162, 'mixed', 'candidate', 162, '普通', 0, ['nonexistent']), RangeError);
});
test('older gold without enhancement does not beat ordinary gear across two promotion steps', () => {
  const score = level => curveDraftEquipment(level).reduce((sum, item) => sum + item.atk * 2.2 + item.def * 1.6 + item.hp * .22, 0);
  for (const [oldLevel, nextLevel] of [[11, 36], [35, 56], [55, 72], [71, 112], [111, 162], [161, 212]]) {
    const oldGold = curveDraftEquipment(oldLevel, '金色').reduce((sum, item) => sum + item.atk * 2.2 + item.def * 1.6 + item.hp * .22, 0);
    assert.ok(score(nextLevel) > oldGold, `${oldLevel} gold vs ${nextLevel} ordinary`);
  }
});

test('eight worn slots share the full budget at every level, with monotone rings and no free duplicated core', () => {
  let previous;
  for (let level=1;level<=250;level++) {
    const items=curveDraftFullEquipment(level),budget=draftWholeSetBudget(level);
    assert.equal(items.length,8);
    assert.equal(new Set(items.map(item=>item.uid)).size,8);
    for (const stat of ['atk','def','hp']) {
      const total=items.reduce((sum,item)=>sum+item[stat],0);
      assert.ok(total<=budget[stat] && budget[stat]-total<=1);
      if(previous) items.forEach((item,index)=>assert.ok(item[stat]>=previous[index][stat]));
    }
    const gold=curveDraftFullEquipment(level,'金色',15);
    gold.forEach((item,index)=>assert.equal(item.atk,items[index].atk*4));
    for(const stat of ['atk','def','hp']) assert.equal(items[6][stat],items[7][stat]);
    previous=items;
  }
});

test('eight-slot fixture uses identical-budget rings; floor rounding cannot exceed the seven-piece budget', () => {
  for(const level of [12,36,56,72,112,162,212,250]) {
    const seven=curveFixture(level,'mixed','candidate'),eight=curveFixture(level,'mixed','candidate',level,'普通',0,null,true);
    eight.party.forEach((unit,index)=>{
      assert.ok(unit.attack<=seven.party[index].attack && seven.party[index].attack-unit.attack<=3);
      assert.ok(unit.maxHp<=seven.party[index].maxHp && seven.party[index].maxHp-unit.maxHp<=1);
      assert.equal(unit.defense,seven.party[index].defense);
    });
    assert.equal(Object.keys(eight.units[0].equip).length,8);
    assert.equal(eight.units[0].equip.ring2.slot,'ring');
    assert.notEqual(eight.units[0].equip.ring1.uid,eight.units[0].equip.ring2.uid);
  }
});
