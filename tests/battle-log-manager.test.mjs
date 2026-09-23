import test from "node:test";
import assert from "node:assert/strict";
import { BattleLogManager } from "../app/battle-log-manager.ts";

test("Battle Log keeps newest entries first and supports clearing", () => {
  const started = BattleLogManager.addLog([], "戰鬥開始：狸貓。", "battle", 1000);
  const reward = BattleLogManager.addLog(started, "Gold +15。", "reward", 1001);
  assert.deepEqual(BattleLogManager.getLogs(reward).map((entry) => entry.message), ["Gold +15。", "戰鬥開始：狸貓。"]);
  assert.deepEqual(BattleLogManager.clear(), []);
});

test("Battle Log caps history at the latest one hundred entries", () => {
  let logs = [];
  for (let index = 0; index < 105; index += 1) logs = BattleLogManager.addLog(logs, `紀錄 ${index}`, "battle", index);
  const visible = BattleLogManager.getLogs(logs);
  assert.equal(visible.length, 100);
  assert.equal(visible[0].message, "紀錄 104");
  assert.equal(visible.at(-1).message, "紀錄 5");
});
