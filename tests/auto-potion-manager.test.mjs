import test from "node:test";
import assert from "node:assert/strict";
import { AutoPotionManager } from "../app/auto-potion-manager.ts";
const catalog = [{ id: "healing", name: "金創藥", effect: "主角與出戰傭兵恢復 50% 最大 HP（可救起倒下者）", hpRestore: .5 }, { id: "mana", name: "回靈散", effect: "恢復 MP", hpRestore: 0 }];

test("Auto Potion lists only owned healing items and configures a default selection", () => {
  assert.deepEqual(AutoPotionManager.available({ healing: 2, mana: 4 }, catalog), [{ id: "healing", name: "金創藥", effect: "主角與出戰傭兵恢復 50% 最大 HP（可救起倒下者）", hpRestore: .5, quantity: 2 }]);
  assert.deepEqual(AutoPotionManager.configure(undefined, { enabled: true }, { healing: 2 }, catalog).settings, { enabled: true, medicineId: "healing", threshold: 30 });
});

test("Auto Potion consumes at its saved threshold and disables itself only when the potion is unavailable", () => {
  const settings = { enabled: true, medicineId: "healing", threshold: 50 };
  assert.deepEqual(AutoPotionManager.nextAction(settings, { healing: 1 }, [{ hp: 501, maxHp: 1000 }], catalog), { type: "none" });
  assert.deepEqual(AutoPotionManager.nextAction(settings, { healing: 1 }, [{ hp: 500, maxHp: 1000 }], catalog), { type: "use", medicineId: "healing" });
  assert.deepEqual(AutoPotionManager.nextAction(settings, {}, [{ hp: 500, maxHp: 1000 }], catalog), { type: "shortage", settings: { ...settings, enabled: false } });
  assert.deepEqual(AutoPotionManager.nextAction(settings, { healing: 1 }, [{ hp: 1000, maxHp: 1000 }, { hp: 0, maxHp: 500 }], catalog), { type: "use", medicineId: "healing" });
  assert.deepEqual(AutoPotionManager.nextAction({ ...settings, enabled: false }, { healing: 1 }, [{ hp: 0, maxHp: 1000 }], catalog), { type: "none" });
});
