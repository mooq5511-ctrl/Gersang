import test from 'node:test';
import assert from 'node:assert/strict';
import { getFirstMercenaryObjective } from '../app/first-mercenary-objective.ts';

test('an affordable first hire points directly to the city mercenary guild', () => {
  assert.deepEqual(getFirstMercenaryObjective({ level: 3, mercenaryCount: 0, gold: 6000, recruitmentCost: 5520 }), {
    title: '招募第一位傭兵',
    detail: '資金 6,000 / 5,520 兩；前往中央傭兵公會，為商隊增加前線火力與承傷。',
    tab: 'city',
    service: 'mercenary',
  });
});

test('does not redirect when underfunded, already hired, or past the early-game gate', () => {
  assert.equal(getFirstMercenaryObjective({ level: 3, mercenaryCount: 0, gold: 5519, recruitmentCost: 5520 }), null);
  assert.equal(getFirstMercenaryObjective({ level: 3, mercenaryCount: 1, gold: 6000, recruitmentCost: 5520 }), null);
  assert.equal(getFirstMercenaryObjective({ level: 20, mercenaryCount: 0, gold: 6000, recruitmentCost: 5520 }), null);
});
