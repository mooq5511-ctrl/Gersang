/** Low-tier road enemy. Ratings are relative design values, not raw damage. */
export const bandit = {
  name: "山賊", boss: false, xp: 60, physicalResistance: 0, magicResistance: 0,
  drops: ["乾馬肉", "下級精髓"], skill: "山寨地利／攔路劈砍／揚沙偷襲",
  hp: 600, attack: 30, defense: 20, speed: 5,
  ratings: { hp: 3, attack: 3, defense: 2, speed: 5 },
};
export const isBanditEncounter = (mapId: string, stage: number) => mapId === "korea-field" && stage >= 1 && stage <= 9 && stage % 2 === 1;
