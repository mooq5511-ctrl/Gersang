import type { Equipment, GameState, Hero, Unit } from './game-state';
import type { NpcId } from './npc-dialogue';
import type { ProgressionRoadmapStage } from './progression-roadmap';
import { worldCities } from './v15-data';
import { vitalStats } from './vitals-engine';
import { guildSkillTradeBonuses } from './guild-skills';
import { unitPower } from './game-progression';
import { newcomerUnlocks } from './newcomer-unlocks';
import {
  HANYANG_PROLOGUE_STEPS,
  HANYANG_PROLOGUE_DIALOGUE,
} from './hanyang-prologue';
import { getStarterWeaponObjective } from './starter-equipment-objective';
import { getFirstMercenaryObjective } from './first-mercenary-objective';
import { fusionItemKey, isFusionIngredient } from './equipment-fusion';
import { relicBossReadiness } from './relic-dungeon';

const relicRarityScore: Record<Equipment['rarity'], number> = {
  普通: 1,
  稀有: 2,
  史詩: 4,
  傳說: 7,
  金色: 10,
};
export const relicEquipmentScore = (unit: Unit | Hero) =>
  Object.values(unit.equip).reduce(
    (score, item) =>
      item
        ? score +
          relicRarityScore[item.rarity] +
          (item.enhance || 0) * 0.5 +
          (item.socketGem ? 2 : 0)
        : score,
    0,
  );
export const FIRST_CARAVAN_QUEST_ID = 'npc-first-caravan-delivery';
export const FIRST_CARAVAN_TARGET = 3;

/** Derive the journal objective and roadmap without changing saved state. */
export function getProgressionView(game: GameState) {
  const currentCity =
    worldCities.find((city) => city.id === game.city) || worldCities[0];
  const heroVital = vitalStats(game.hero);
  const guildSkillBonus = guildSkillTradeBonuses(game.guildSkills);
  const displayedPower = (unit: Unit | Hero) =>
    Math.floor(
      unitPower(unit) *
        (1 +
          (unit.uid === 'hero'
            ? guildSkillBonus.heroPowerBonus
            : guildSkillBonus.mercenaryPowerBonus)),
    );
  const progressiveUnlocks = newcomerUnlocks(game);
  const hanyangStep =
    HANYANG_PROLOGUE_STEPS.find(
      ({ step }) => step === game.hanyangPrologueStep,
    ) || HANYANG_PROLOGUE_STEPS[0];
  const firstCaravanBossReady =
    game.npcProgress.completedQuests.includes(FIRST_CARAVAN_QUEST_ID) &&
    game.hero.level >= 20 &&
    game.territory.buildings.waystation >= 1 &&
    (game.firstGreenEquipped ||
      [game.hero, ...game.mercs, ...game.restingMercs].some((unit) =>
        Object.values(unit.equip).some(
          (item) => item && item.rarity !== '普通',
        ),
      ));
  const roadmapRelic = game.relicDungeon;
  const roadmapDone = {
    outskirts: game.npcProgress.completedQuests.includes(
      FIRST_CARAVAN_QUEST_ID,
    ),
    bandit: game.newbieBossDefeated,
    relicOne: (roadmapRelic?.clearedRuns || 0) >= 1,
    relicTwo: (roadmapRelic?.clearedRuns || 0) >= 2,
    regionBoss: game.lakeBossDefeated,
  };
  const roadmapUnlocked = {
    outskirts: true,
    bandit: firstCaravanBossReady,
    relicOne: progressiveUnlocks.relic,
    relicTwo: roadmapDone.relicOne,
    regionBoss: roadmapDone.relicTwo,
  };
  const roadmapCurrentId =
    (Object.keys(roadmapDone) as Array<keyof typeof roadmapDone>).find(
      (id) => !roadmapDone[id] && roadmapUnlocked[id],
    ) ||
    (Object.keys(roadmapDone) as Array<keyof typeof roadmapDone>).find(
      (id) => !roadmapDone[id],
    );
  const roadmapStages: ProgressionRoadmapStage[] = [
    {
      id: 'outskirts',
      label: '漢陽郊外',
      condition: `完成委託 ${Math.min(game.starterDeliveryKills, FIRST_CARAVAN_TARGET)} / ${FIRST_CARAVAN_TARGET}`,
      reward: '商路短劍與啟程資金',
      state: roadmapDone.outskirts
        ? 'done'
        : roadmapCurrentId === 'outskirts'
          ? 'current'
          : 'locked',
    },
    {
      id: 'bandit',
      label: '山賊首領',
      condition: 'Lv.20・驛站 Lv.1・裝備一件非普通裝備',
      reward: '開通千年湖',
      state: roadmapDone.bandit
        ? 'done'
        : roadmapCurrentId === 'bandit'
          ? 'current'
          : 'locked',
    },
    {
      id: 'relicOne',
      label: '遺跡第一層',
      condition: '完成首趟貿易・探索進度 100%',
      reward: '沉沒王朝材料與第一位遺跡 Boss',
      state: roadmapDone.relicOne
        ? 'done'
        : roadmapCurrentId === 'relicOne'
          ? 'current'
          : 'locked',
    },
    {
      id: 'relicTwo',
      label: '遺跡第二層',
      condition: '擊敗第一層 Boss 後再次遠征',
      reward: '第二位 Boss 與更高品質古代裝備',
      state: roadmapDone.relicTwo
        ? 'done'
        : roadmapCurrentId === 'relicTwo'
          ? 'current'
          : 'locked',
    },
    {
      id: 'regionBoss',
      label: '區域 Boss',
      condition: '完成第二層遺跡・隊伍戰力達標',
      reward: '開通千年湖深處與下一張地圖',
      state: roadmapDone.regionBoss
        ? 'done'
        : roadmapCurrentId === 'regionBoss'
          ? 'current'
          : 'locked',
    },
  ];
  const mainObjective = (() => {
    if (game.hanyangPrologueStep !== 'completed') {
      if (game.hanyangPrologueStep === 'arrival') {
        const firstQuestActive = game.npcProgress.activeQuests.includes(
          FIRST_CARAVAN_QUEST_ID,
        );
        if (
          firstQuestActive &&
          game.starterDeliveryKills >= FIRST_CARAVAN_TARGET
        )
          return {
            title: '回村長處領取戰利品',
            detail:
              '驛路已清出來了，回到金成浩身邊回報，領取白裝短劍後再進行穿戴。',
            tab: 'map' as const,
            npcId: 'kim-seongho' as NpcId,
          };
        return {
          title: '村長的緊急委託',
          detail: '小嚮導米米說村長正在找你；先前往村長處接下第一份商隊委託。',
          tab: 'map' as const,
          npcId: 'kim-seongho' as NpcId,
        };
      }
      if (game.hanyangPrologueStep === 'outskirts')
        return {
          title: hanyangStep.title,
          detail: hanyangStep.detail,
          tab: 'battle' as const,
          mapId: 'starter-outskirts',
          monsterName: '狸貓',
        };
      if (game.hanyangPrologueStep === 'first-sale') {
        const starterWeaponObtained =
          game.inventory.some((item) => item.name === '商路短劍') ||
          Object.values(game.hero.equip).some(
            (item) => item?.name === '商路短劍',
          );
        if (
          !starterWeaponObtained &&
          game.npcProgress.activeQuests.includes(FIRST_CARAVAN_QUEST_ID) &&
          game.starterDeliveryKills >= FIRST_CARAVAN_TARGET
        )
          return {
            title: '回村長處領取戰利品',
            detail:
              '驛路已清出來了，回到金成浩身邊回報，領取白裝短劍後再進行穿戴。',
            tab: 'map' as const,
            npcId: 'kim-seongho' as NpcId,
          };
        return {
          title: game.hanyangPrologueFlags.equipmentEquipped
            ? '出售第一批戰利品'
            : '查看並穿戴第一件裝備',
          detail: game.hanyangPrologueFlags.equipmentEquipped
            ? '把剛取得的肉類材料出售 1 個，學會將戰利品換成銀兩。'
            : '打開背包查看新取得的裝備，並實際穿戴到主角身上。',
          tab: 'squad' as const,
          window: 'inventory' as const,
        };
      }
      if (game.hanyangPrologueStep === 'journey-fund')
        return {
          title: hanyangStep.title,
          detail: '回到老商人身邊，先聽完交易說明，再領取一次性的啟程資金。',
          tab: 'map' as const,
          npcId: 'wang-deokchang' as NpcId,
        };
      if (game.hanyangPrologueStep === 'medicine')
        return {
          title: hanyangStep.title,
          detail: '前往藥店，實際購買 1 瓶金創藥，為下一段商路準備補給。',
          tab: 'city' as const,
          service: 'pharmacy' as const,
        };
      if (game.hanyangPrologueStep === 'guild')
        return {
          title: hanyangStep.title,
          detail: HANYANG_PROLOGUE_DIALOGUE.guild.join(' '),
          tab: 'city' as const,
          service: 'mercenary' as const,
        };
      if (game.hanyangPrologueStep === 'formation')
        return {
          title: hanyangStep.title,
          detail: '打開隊伍介面，確認第一名傭兵已處於出戰狀態。',
          tab: 'squad' as const,
        };
      if (game.hanyangPrologueStep === 'caravan-crisis')
        return {
          title: hanyangStep.title,
          detail: '北邊商路出事了；先向老商人了解發生什麼事。',
          tab: 'map' as const,
        };
      if (game.hanyangPrologueStep === 'caravan-delivery')
        return {
          title: hanyangStep.title,
          detail: '前往老商人王德昌處，親手交付找回的商隊貨物。',
          tab: 'map' as const,
          npcId: 'wang-deokchang' as NpcId,
        };
      if (game.hanyangPrologueStep === 'bandit-trial')
        return {
          title: hanyangStep.title,
          detail: hanyangStep.detail,
          tab: 'battle' as const,
          mapId: 'starter-outskirts',
          monsterName: '黑巾山賊',
        };
      if (game.hanyangPrologueStep === 'return')
        return {
          title: hanyangStep.title,
          detail: '商隊貨物已交回；回到村長金成浩處，報告北邊商路的結果。',
          tab: 'map' as const,
          npcId: 'kim-seongho' as NpcId,
        };
      return {
        title: hanyangStep.title,
        detail: '村長已聽完回報；向他確認離開漢陽，正式踏上世界地圖。',
        tab: 'map' as const,
        npcId: 'kim-seongho' as NpcId,
      };
    }
    if (game.hero.status === '客棧中')
      return {
        title: '恢復商隊戰力',
        detail: `生命 ${heroVital.hp} / ${heroVital.maxHp}，療傷完成後可再度出發。`,
        tab: 'city',
      };
    const firstDeliveryCompleted = game.npcProgress.completedQuests.includes(
      FIRST_CARAVAN_QUEST_ID,
    );
    const firstDeliveryActive = game.npcProgress.activeQuests.includes(
      FIRST_CARAVAN_QUEST_ID,
    );
    if (!firstDeliveryCompleted) {
      if (!firstDeliveryActive)
        return {
          title: '在漢陽接下第一份商隊委託',
          detail: '向新手村村長金成浩接下送貨委託，清出通往港口的驛路。',
          tab: 'map',
          npcId: 'kim-seongho' as NpcId,
        };
      if (game.starterDeliveryKills < FIRST_CARAVAN_TARGET)
        return {
          title: '清出送貨驛路',
          detail: `擊敗新手村郊外的狸貓 ${Math.min(game.starterDeliveryKills, FIRST_CARAVAN_TARGET)} / ${FIRST_CARAVAN_TARGET}。只計算委託期間的指定怪物。`,
          tab: 'battle',
          mapId: 'starter-outskirts',
          monsterName: '狸貓',
        };
      return {
        title: '回漢陽交付第一份商隊委託',
        detail: '貨物已能安全送達港口；向金成浩回報，領取白裝短劍與啟程資金。',
        tab: 'map',
        npcId: 'kim-seongho' as NpcId,
      };
    }
    const starterWeaponObjective = getStarterWeaponObjective(game);
    if (starterWeaponObjective) return starterWeaponObjective;
    const firstMercenaryObjective = getFirstMercenaryObjective({
      level: game.hero.level,
      mercenaryCount: game.mercs.length + game.restingMercs.length,
      gold: game.gold,
      recruitmentCost: Math.floor(6000 * currentCity.priceFactor),
    });
    if (firstMercenaryObjective) return firstMercenaryObjective;
    if (!progressiveUnlocks.firstTradeComplete)
      return {
        title: '完成第一趟東海商路',
        detail:
          '派遣傭兵運送貨物並完成結算；第一筆商路收益會帶來沉沒遺跡的線索。',
        tab: 'trade' as const,
      };
    if (progressiveUnlocks.relic && !progressiveUnlocks.firstRelicReward) {
      const relicStatus = game.relicDungeon?.status || 'idle';
      if (relicStatus === 'dispatching')
        return {
          title: '等待遺跡遠征回報',
          detail: '傭兵正在探索沉沒王朝。完成後領取材料、古代裝備與遺跡碎片。',
          tab: 'relic' as const,
        };
      return {
        title: '派遣傭兵探索沉沒遺跡',
        detail: '先將至少一名傭兵調往休息，再派遣他帶回第一份遺跡材料。',
        tab: 'relic' as const,
      };
    }
    if (
      progressiveUnlocks.relic &&
      !progressiveUnlocks.firstRelicBossDefeated
    ) {
      const relic = game.relicDungeon;
      if ((relic?.status || 'idle') === 'dispatching')
        return {
          title: '等待第一層遺跡回報',
          detail: '遠征完成後會自動結算；探索進度達 100% 才能挑戰沉沒王。',
          tab: 'relic' as const,
        };
      if ((relic?.status || 'idle') === 'boss')
        return {
          title: '討伐遺跡第一層 Boss',
          detail:
            '依照隊伍戰力與裝備品質持續攻擊，注意遠征隊 HP 與 Boss 狂暴階段。',
          tab: 'relic' as const,
        };
      if ((relic?.progress || 0) >= 100) {
        const reserved = relic?.status === 'ready';
        const power = reserved
          ? relic.dispatchPower
          : game.restingMercs.reduce(
              (sum, unit) => sum + displayedPower(unit),
              0,
            );
        const hp = reserved
          ? relic.maxHp
          : game.restingMercs.reduce(
              (sum, unit) => sum + vitalStats(unit).maxHp,
              0,
            );
        const count = reserved ? relic.partyCount : game.restingMercs.length;
        const quality = reserved
          ? relic.dispatchEquipmentScore || 0
          : game.restingMercs.reduce(
              (sum, unit) => sum + relicEquipmentScore(unit),
              0,
            );
        const preparation = relicBossReadiness(power, hp, count, quality);
        if (!preparation.ready && game.hero.level < 20)
          return {
            title: '討伐前整備・提升商隊等級',
            detail: `王座進度已保留。主角 Lv.${game.hero.level} / 20；先將傭兵取出上陣練功，再回遺跡準備 Lv.${preparation.bossLevel} 首領。`,
            tab: 'battle' as const,
          };
        if (!preparation.ready)
          return {
            title: '討伐前整備・壯大遠征隊',
            detail: `目前戰力 ${Math.floor(power).toLocaleString()}、生命 ${Math.floor(hp).toLocaleString()}。整備參考：戰力 ${preparation.powerTarget.toLocaleString()}、生命 ${preparation.hpTarget.toLocaleString()}；補齊傭兵與裝備後重新派遣。`,
            tab: 'relic' as const,
          };
        return {
          title: '組織第一層 Boss 討伐',
          detail:
            '目前編制已具備討伐能力；王座進度已保留，進入 Boss 戰取得第一枚遺跡核心。',
          tab: 'relic' as const,
        };
      }
      return {
        title: '累積遺跡第一層探索進度',
        detail: `目前進度 ${Math.round(relic?.progress || 0)} / 100；派遣裝備品質越高的傭兵，清剿效率與回報越好。`,
        tab: 'relic' as const,
      };
    }
    if (
      progressiveUnlocks.firstRelicBossDefeated &&
      (game.relicDungeon?.clearedRuns || 0) < 2
    ) {
      const relic = game.relicDungeon;
      if (relic?.status === 'dispatching')
        return {
          title: '等待遺跡第二層回報',
          detail: '第二層遠征完成後會自動結算，再組織下一位 Boss 討伐。',
          tab: 'relic' as const,
        };
      if (relic?.status === 'boss')
        return {
          title: '討伐遺跡第二層 Boss',
          detail: '第二位首領已現身；更高品質裝備會提高傷害並降低反擊。',
          tab: 'relic' as const,
        };
      if ((relic?.progress || 0) >= 100)
        return {
          title: '組織第二層 Boss 討伐',
          detail: '再次遠征已抵達王座，擊敗第二位首領以取得區域 Boss 資格。',
          tab: 'relic' as const,
        };
      return {
        title: '再次派遣，解鎖遺跡第二層',
        detail: `目前進度 ${Math.round(relic?.progress || 0)} / 100；第二層會提高材料與古代裝備品質。`,
        tab: 'relic' as const,
      };
    }
    if (game.hero.level < 20)
      return {
        title: '壯大商隊，建立第一座駐地',
        detail: `主角 Lv.${game.hero.level} / Lv.20，商團領地即將開放。`,
        tab: 'battle',
      };
    if (game.territory.buildings.waystation < 1)
      return {
        title: '建立驛站，提升放置收益',
        detail: `資金 ${Math.floor(game.gold).toLocaleString('zh-TW')} / 1,200 兩；建成後放置收益 +2%。`,
        tab: 'squad',
        window: 'territory' as const,
      };
    const equippedGreen =
      game.firstGreenEquipped ||
      [game.hero, ...game.mercs, ...game.restingMercs].some((unit) =>
        Object.values(unit.equip).some(
          (item) => item && item.rarity !== '普通',
        ),
      );
    if (!equippedGreen) {
      const green = game.inventory.find(
        (item) =>
          item.rarity !== '普通' &&
          (item.requiredLevel || 1) <= game.hero.level,
      );
      if (green)
        return {
          title: `裝上「${green.name}」，感受成長`,
          detail: '打開背包穿戴裝備，查看實際能力提升。',
          tab: 'squad',
          window: 'inventory' as const,
        };
      const groups = new globalThis.Map<string, Equipment[]>();
      for (const item of game.inventory)
        if (
          isFusionIngredient(item, '普通') &&
          (item.requiredLevel || 1) <= game.hero.level
        ) {
          const key = fusionItemKey(item);
          groups.set(key, [...(groups.get(key) || []), item]);
        }
      const group = [...groups.values()].sort((a, b) => b.length - a.length)[0];
      const count = Math.min(5, group?.length || 0);
      return {
        title: count === 5 ? '合成第一件綠裝' : '收集同名白裝，準備第一次合成',
        detail: `${group?.[0].name || '同名同部位白裝'} ${count} / 5；${count === 5 ? '材料齊全，白→綠成功率 100%。' : `還差 ${5 - count} 件。只計算背包內未強化、未鑲嵌的裝備。`}`,
        tab: 'squad',
        window: 'territory' as const,
      };
    }
    if (!game.newbieBossDefeated)
      return {
        title: '討伐山賊首領，開通千年湖',
        detail: '第一輪成長已完成；挑戰新手村郊外的山賊首領，突破下一段商路。',
        tab: 'battle',
        mapId: 'starter-outskirts',
        monsterName: '山賊首領',
      };
    if (!game.lakeBossDefeated)
      return {
        title: '前往千年湖，追擊狂風阿魯塔',
        detail: '千年湖已開通；擊敗首領後可前往日本海底洞。',
        tab: 'battle',
      };
    if (!game.goldenStarfishDefeated)
      return {
        title: '討伐黃金海星，開通白虎林',
        detail: '挑戰日本海底洞，取得前往白虎林的資格。',
        tab: 'battle',
      };
    return {
      title: '持續壯大商隊',
      detail: '提高等級、強化隊伍，朝下一個地圖與傳說裝備前進。',
      tab: 'battle',
    };
  })();
  return { firstCaravanBossReady, roadmapStages, mainObjective };
}
