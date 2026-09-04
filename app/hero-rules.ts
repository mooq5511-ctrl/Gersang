/** 主角個人面板專用公式；敏捷在遊戲資料中稱為 agi，智力稱為 intel。 */
export type HeroAttributes = {str:number;agi:number;vit:number;intel:number;level:number};
export const heroPersonalPower=(hero:HeroAttributes)=>hero.str*2+hero.agi*3+hero.vit*1.5+hero.intel*2+hero.level*10;
export const heroWeightLimit=(hero:Pick<HeroAttributes,'str'>)=>200+hero.str*5;
export const HERO_INITIAL_ATTRIBUTES={str:20,agi:15,vit:20,intel:10};
