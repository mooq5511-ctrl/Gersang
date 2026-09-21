import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VILLAGE_NPCS,
  activeNpcQuests,
  awardNpcAffinity,
  completeNpcQuest,
  freshNpcProgress,
  hasNpcAffinityReward,
  normalizeNpcProgress,
  npcById,
  npcGreeting,
  npcQuestState,
  startNpcQuest,
} from '../app/npc-dialogue.ts';

const game = () => ({ gold: 0, stage: 1, kills: 0, starterDeliveryKills: 0, mercs: [], materials: {}, inventory: [], hero: { equip: {} }, npcProgress: freshNpcProgress() });

test('Hanyang NPC catalog has ten unique, positioned quest givers', () => {
  assert.equal(VILLAGE_NPCS.length, 10);
  assert.equal(new Set(VILLAGE_NPCS.map(npc => npc.id)).size, 10);
  assert.equal(new Set(VILLAGE_NPCS.map(npc => npc.quest?.id)).size, 10);
  for (const npc of VILLAGE_NPCS) {
    assert.ok(npc.quest?.target > 0, `${npc.id} is missing a quest target`);
    assert.ok(npc.map.x >= 0 && npc.map.x <= 100);
    assert.ok(npc.map.y >= 0 && npc.map.y <= 100);
    assert.ok(npc.options.length >= 2);
  }
});

test('NPC affinity topics grant their reward only once and survive save normalization', () => {
  const npc = npcById('wang-deokchang');
  const topic = npc.options.find(option => option.affinity);
  let state = game();
  assert.deepEqual(freshNpcProgress().affinityChoices, []);

  state = awardNpcAffinity(state, npc, topic);
  assert.equal(state.npcProgress.affinity[npc.id], 1);
  assert.ok(hasNpcAffinityReward(state.npcProgress, npc, topic));
  assert.strictEqual(awardNpcAffinity(state, npc, topic), state);

  const restored = normalizeNpcProgress(JSON.parse(JSON.stringify(state.npcProgress)));
  assert.deepEqual(restored.affinityChoices, [`${npc.id}:${topic.label}`]);
  assert.equal(awardNpcAffinity({ ...state, npcProgress: restored }, npc, topic).npcProgress.affinity[npc.id], 1);
  assert.deepEqual(normalizeNpcProgress({ affinity: { [npc.id]: 200 } }).affinityChoices, []);
});

test('legacy saves without affinity-topic history load safely', () => {
  const restored = normalizeNpcProgress({ met: ['kim-seongho'], affinity: { 'kim-seongho': 2 }, activeQuests: [], completedQuests: [], history: [] });
  assert.deepEqual(restored.affinityChoices, []);
  assert.equal(restored.affinity['kim-seongho'], 2);
});

test('NPC quests cannot be claimed early or paid twice', () => {
  const npc = npcById('kim-seongho');
  const initial = game();
  assert.equal(npcGreeting(initial, npc), npc.first);
  assert.strictEqual(completeNpcQuest(initial, npc), initial);

  const started = startNpcQuest(initial, npc);
  assert.equal(npcQuestState(started, npc), 'active');
  assert.strictEqual(startNpcQuest(started, npc), started);
  assert.strictEqual(completeNpcQuest(started, npc), started);

  const ready = { ...started, starterDeliveryKills: npc.quest.target };
  const completed = completeNpcQuest(ready, npc);
  assert.equal(completed.gold, initial.gold + npc.quest.reward.gold);
  assert.equal(completed.npcProgress.affinity[npc.id], npc.quest.reward.affinity);
  assert.deepEqual(completed.npcProgress.completedQuests, [npc.quest.id]);
  assert.equal(npcQuestState(completed, npc), 'complete');
  assert.strictEqual(completeNpcQuest(completed, npc), completed);
});

test('accepted village quests expose live progress for the central quest tracker', () => {
  const npc = npcById('kim-seongho');
  let state = startNpcQuest(game(), npc);
  state = { ...state, starterDeliveryKills: 2 };
  assert.deepEqual(activeNpcQuests(state).map(({ quest, progress }) => [quest.id, progress]), [[npc.quest.id, 2]]);
  state = { ...state, npcProgress: { ...state.npcProgress, activeQuests: [] } };
  assert.deepEqual(activeNpcQuests(state), []);
});
