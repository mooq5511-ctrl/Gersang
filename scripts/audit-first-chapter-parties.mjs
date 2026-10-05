// Isolated combat audit, NOT natural acquisition or a player save.
import {curveFixture} from './measure-equipment-curve.mjs';
import {measureEquipmentFixture} from './measure-equipment-early.mjs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {grantXp,xpNeed}=require('../app/game-progression.ts');
const {promoteMercenaryV1}=require('../app/mercenary-promotion-v1.ts');
const {allocateAttributeAction}=require('../app/game-squad-actions.ts');
const {combatStats,vitalStats}=require('../app/vitals-engine.ts');

export function chapterParty({count=3,branch='none',gear='core',allocation='balanced',promotions=branch==='none'?0:1,gearLevel=12}={}){
  if(![1,2,3].includes(count)||!['none','spear','bow'].includes(branch)||!['none','weapon','core','full'].includes(gear)||!['none','balanced'].includes(allocation)||!Number.isInteger(promotions)||promotions<0||promotions>count||branch==='none'&&promotions!==0)throw new RangeError('Invalid chapter scenario');
  if(!Number.isInteger(gearLevel)||gearLevel<1||gearLevel>20)throw new RangeError('Invalid chapter gear level');
  let state=freshGame('第一章投入核對');
  const xp=Array.from({length:19},(_,index)=>xpNeed(index+1)).reduce((sum,n)=>sum+n,0);
  state.hero=grantXp(state.hero,xp);
  const starter=curveFixture(1,'spear','empty').units[1];
  state.mercs=Array.from({length:count},(_,index)=>grantXp({...starter,uid:`merc-${index}`,level:1,xp:0,points:0,promotionStage:1,tier:1},xp));
  if(branch!=='none'){
    const name=branch==='spear'?'長槍兵符':'長弓兵符';
    state.materials={[name]:promotions};
    for(let index=0;index<promotions;index++)state=promoteMercenaryV1(state,`merc-${index}`,2,branch);
    if(state.materials[name]!==0)throw new Error('Promotion seal consumption failed');
    state.mercs=state.mercs.map(unit=>grantXp(unit,0));
  }
  if(allocation==='balanced')for(const unit of [state.hero,...state.mercs]){
    const strength=Math.ceil(unit.points/2);
    state=allocateAttributeAction(state,unit.uid,'str',strength);
    state=allocateAttributeAction(state,unit.uid,'vit',unit.points-strength);
  }
  const slots={none:[],weapon:['weapon'],core:['weapon','armor','helm'],full:null}[gear];
  const units=[state.hero,...state.mercs].map((unit,index)=>({...unit,
    position:index===0||unit.templateId==='merchant-promotion-bow'?'後排':'前排',
    equip:curveFixture(unit.level,'spear','live',Math.min(gearLevel,unit.level),'普通',0,slots,true).units[0].equip}));
  const party=units.map(unit=>{
    const vital=vitalStats(unit),combat=combatStats(unit);
    return {uid:unit.uid,templateId:unit.templateId,name:unit.name,skill:unit.skill,
      hp:vital.maxHp,maxHp:vital.maxHp,mp:vital.maxMp,maxMp:vital.maxMp,position:unit.position,
      attack:combat.attack,defense:combat.defense,physicalResist:vital.physicalResist,magicResist:vital.magicResist,
      accuracy:combat.accuracy,attackInterval:Math.max(.6,2.2-combat.speed/100)};
  });
  return {units,party,consumedSeals:promotions,remainingSeals:state.materials};
}

export function measureChapterParty(scenario,seeds=30){
  const fixture=chapterParty(scenario);
  const samples=Array.from({length:seeds},(_,i)=>measureEquipmentFixture(fixture,'e_starter_pirate_king',.99,i+1,1));
  return {...scenario,seeds,wins:samples.filter(row=>row.victories===1).length,
    averageSeconds:samples.reduce((sum,row)=>sum+row.fights[0].seconds,0)/seeds,
    levels:fixture.units.map(unit=>unit.level),ranks:fixture.units.map(unit=>unit.promotionStage??0),
    stats:samples[0].stats};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const rows=[];
  for(const count of [1,2,3])for(const branch of ['none','spear','bow'])for(const gear of ['none','weapon','core','full'])for(const allocation of ['none','balanced'])rows.push(measureChapterParty({count,branch,gear,allocation}));
  console.log(JSON.stringify({conditions:'Hero20; rank1 mercs capped12 by real grantXp; at most one real promotion consumes one supplied seal and permits20. Gear supplied ordinary <=Lv12, no enhancement/affix. Balanced allocation uses actual earned points, half str/half vit. Full initial HP/MP, skills on, no potions. Does not prove XP, recruitment or equipment affordability.',rows},null,2));
}
