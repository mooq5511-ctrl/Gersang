import test from 'node:test';
import assert from 'node:assert/strict';
import {chapterParty,measureChapterParty} from '../scripts/audit-first-chapter-parties.mjs';

test('chapter party fixture respects actual rank-one cap, one-seal promotion and earned points',()=>{
  const unpromoted=chapterParty({branch:'none',allocation:'none',gear:'none'});
  assert.deepEqual(unpromoted.units.map(unit=>unit.level),[20,12,12,12]);
  assert.deepEqual(unpromoted.units.map(unit=>unit.points),[95,33,33,33]);
  const one=chapterParty({branch:'spear',allocation:'balanced',gear:'core'});
  assert.deepEqual(one.units.map(unit=>unit.level),[20,20,12,12]);
  assert.deepEqual(one.units.slice(1).map(unit=>unit.promotionStage),[2,1,1]);
  assert.ok(one.units.every(unit=>unit.points===0));
  assert.equal(one.consumedSeals,1);
  assert.equal(one.remainingSeals['長槍兵符'],0);
  assert.deepEqual(Object.keys(one.units[0].equip).sort(),['armor','helm','weapon']);
});

test('partial ordinary gear affects real combat stats without affixes or free enhancement',()=>{
  const empty=chapterParty({gear:'none'}),full=chapterParty({gear:'full'});
  full.units.forEach((unit,index)=>{
    assert.ok(full.party[index].attack>empty.party[index].attack);
    assert.ok(full.party[index].maxHp>empty.party[index].maxHp);
    for(const item of Object.values(unit.equip)){
      assert.equal(item.rarity,'普通');assert.equal(item.enhance,0);
      assert.ok(item.requiredLevel<=12);assert.equal(item.magic.length,0);
    }
  });
  const bow=chapterParty({branch:'bow',promotions:2});
  assert.equal(bow.consumedSeals,2);
  assert.equal(bow.remainingSeals['長弓兵符'],0);
  assert.deepEqual(bow.units.map(unit=>unit.level),[20,20,20,12]);
  assert.throws(()=>chapterParty({promotions:4}),RangeError);
});

test('one promoted companion plus two capped starters can beat chapter boss with level-appropriate ordinary gear',()=>{
  for(const branch of ['spear','bow']){
    const scenario={count:3,promotions:1,branch,gear:'full',gearLevel:20,allocation:'balanced'};
    const fixture=chapterParty(scenario);
    assert.deepEqual(fixture.units.map(unit=>unit.level),[20,20,12,12]);
    fixture.units.forEach(unit=>Object.values(unit.equip).forEach(item=>assert.ok(item.requiredLevel<=unit.level)));
    assert.equal(fixture.consumedSeals,1);
    const result=measureChapterParty(scenario,30);
    assert.equal(result.wins,30);
    assert.ok(result.averageSeconds<60);
  }
  // Supplied XP, recruitment and gear are NOT evidence of natural first-30-minute availability.
});
