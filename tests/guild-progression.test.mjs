import test from 'node:test';
import assert from 'node:assert/strict';
import {guildRankCost,promoteGuildRankAction} from '../app/guild-rank.ts';
import {freshGuildSkills,guildSkillTradeBonuses,upgradeGuildSkillAction} from '../app/guild-skills.ts';

const addLog = (logs, message) => [message, ...logs];
const baseState = overrides => ({
  credit: 0,
  guildRank: 1,
  guildSkillPoints: 0,
  guildSkills: freshGuildSkills(),
  logs: [],
  ...overrides,
});

test('credit is the real currency for manual guild promotion and grants skill points', () => {
  const state = baseState({ credit: guildRankCost(1) });
  const next = promoteGuildRankAction(state, addLog);
  assert.equal(next.guildRank, 2);
  assert.equal(next.credit, 0);
  assert.equal(next.guildSkillPoints, 1);
});

test('cross-tier promotion grants the extra five skill points', () => {
  const state = baseState({ guildRank: 10, credit: guildRankCost(10) });
  const next = promoteGuildRankAction(state, addLog);
  assert.equal(next.guildRank, 11);
  assert.equal(next.guildSkillPoints, 6);
});

test('guild skill points produce live resource and combat bonuses', () => {
  const state = baseState({ guildRank: 1, guildSkillPoints: 1 });
  const next = upgradeGuildSkillAction(state, 'tradeProsperity', addLog);
  assert.equal(next.guildSkills.tradeProsperity, 1);
  assert.equal(next.guildSkillPoints, 0);
  assert.equal(guildSkillTradeBonuses(next.guildSkills).revenueBonus, 0.03);
});
