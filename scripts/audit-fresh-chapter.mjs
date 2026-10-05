// Earned-state continuation, with explicit scripted choices. NOT a browser/human play test.
import {auditFreshPrologue} from './audit-fresh-prologue.mjs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const {createSquadController}=require('../app/game-squad-controller.ts');
const {createNavigationController}=require('../app/game-navigation-controller.ts');
const {worldCities}=require('../app/v15-data.ts');
const {sourceEnemyForDungeonKey}=require('../app/v17-content.ts');
const {mercenarySpec}=require('../app/mercenary-roster.ts');
const {settleCurrentGame,createGameTickRolls}=require('../app/game-loop.ts');
const {runDungeonAction}=require('../app/game-battle-actions.ts');
const {grantXp}=require('../app/game-progression.ts');
const {appendGameLog,enterGameInnAction,leaveGameInnAction}=require('../app/game-runtime-actions.ts');
const {allocateAttributeAction}=require('../app/game-squad-actions.ts');
const {promoteMercenaryV1}=require('../app/mercenary-promotion-v1.ts');
const {sellAllMaterialsAction,equipInventoryItemAction,buyMedicineAction,configureAutoPotionAction,applyAutoPotionAction,purchaseTierEquipmentAction,purchaseEquipmentBatchAction}=require('../app/game-inventory-actions.ts');
const {wearableCatalog}=require('../app/wearable-catalog.ts');
const {makeWearableEquipment,makeOfficialEquipment,applyShopQuality,rollShopQuality}=require('../app/game-equipment-factory.ts');
const {getGameView}=require('../app/game-view-selector.ts');
const {WEAPON_SHOP_QUALITY}=require('../app/game-config.ts');
const {dispatchTradeAction}=require('../app/game-trade-actions.ts');
const {equipmentAtTier,tierEquipmentPrice}=require('../app/tier-equipment.ts');
const {vitalStats}=require('../app/vitals-engine.ts');
const {effectiveEquipmentStats}=require('../app/equipment-stats.ts');
const noop=()=>{};
const deps={addLog:appendGameLog,grantXp,enterInn:enterGameInnAction,leaveInn:leaveGameInnAction};

export function auditFreshChapter({seed=1,branch='spear',tradeSeconds=0,seconds=1800,starterGear='core',cityUpgrades=false}={}){
  if(!Number.isInteger(seed)||!['spear','bow'].includes(branch)||!['none','core','full'].includes(starterGear)||typeof cityUpgrades!=='boolean'||!Number.isInteger(tradeSeconds)||tradeSeconds<0||tradeSeconds>600||!Number.isInteger(seconds)||seconds<180||seconds>1800)throw new RangeError('Invalid chapter audit input');
  const prologue=auditFreshPrologue({seed,captureState:true});
  if(!prologue.completed)throw new Error('Cannot continue an unfinished prologue');
  let game=prologue.state,now=Date.UTC(2026,9,5)+seed*1000000+prologue.elapsedSeconds*1000;
  const start=Date.UTC(2026,9,5)+seed*1000000,tradeEnd=now+tradeSeconds*1000;
  let rng=(seed^0x9e3779b9)>>>0,notice='',serial=0,recoveries=0,potionsUsed=0,gearSpent=0,potionSpent=0,recruitSpent=0,nextService=now;
  let phase=tradeSeconds?'trade':'hunt',oldStatus=game.dungeon?.status,bossAttempted=false,promotedAt=null,level20At=null;
  let loopNetGold=0,materialSales=0,tradeDispatchSpent=0,battleActionNetGold=0;
  const snapshots=[],cityPurchases=[],attemptedCityUpgrades=new Set(),originalRandom=Math.random,originalDate=Date.now;
  const setGame=update=>{game=typeof update==='function'?update(game):update;};
  const setNotice=value=>{notice=value;};
  const city=()=>worldCities.find(entry=>entry.id===game.city);
  const action=(name,key)=>{const before=game.gold;game=runDungeonAction(game,name,now,key,createGameTickRolls(),deps);battleActionNetGold+=game.gold-before;};
  const members=()=>[game.hero,...game.mercs];
  const score=item=>{if(!item)return 0;const stats=effectiveEquipmentStats(item);return stats.atk+stats.def+stats.hp/10;};
  const target=()=>game.hero.level>=8?'e_starter_pirate':game.hero.level>=4?'e_starter_bandit':game.hero.level>=2?'e_starter_wako':'e_starter_raccoon';
  const begin=key=>{
    const enemy=sourceEnemyForDungeonKey(key);
    if(!enemy||enemy.mapId!=='starter-outskirts')throw new Error('Do not bypass other map gates');
    createNavigationController({game,mainObjective:{mapId:enemy.mapId,monsterName:enemy.name,tab:'battle'},openNpcDialogue:noop,setActiveNpcId:noop,setActiveTab:noop,setCityService:noop,setGame,setNotice,setNpcOpeningLine:noop,setSquadDestination:noop}).goToObjective();
    action('start-auto-hunt',key);
  };
  const service=()=>{
    action('stop');
    const beforeSale=game.gold;
    game=sellAllMaterialsAction(game,appendGameLog,String); // Formal action preserves war seals.
    materialSales+=game.gold-beforeSale;
    for(const unit of members()){
      if(!unit.points)continue;
      const strength=Math.ceil(unit.points/2),vitality=unit.points-strength;
      game=allocateAttributeAction(game,unit.uid,'str',strength);
      if(vitality)game=allocateAttributeAction(game,unit.uid,'vit',vitality);
    }
    while(game.mercs.length<3&&game.gold>=Math.floor(6000*city().priceFactor)+1000){
      const before=game.gold,count=game.mercs.length;
      createSquadController({game,currentCity:city(),setGame,setNotice,selectedUid:'hero'}).recruitMerchant(mercenarySpec('merchant-spear'),0);
      if(game.mercs.length===count)break;
      recruitSpent+=before-game.gold;
    }
    const first=game.mercs[0],seal=branch==='bow'?'長弓兵符':'長槍兵符';
    if(first?.level>=12&&(first.promotionStage||1)===1&&game.materials[seal]>0){
      game=promoteMercenaryV1(game,first.uid,2,branch);
      if(game.mercs[0].promotionStage===2){game={...game,mercs:game.mercs.map(unit=>unit.uid===first.uid?grantXp(unit,0):unit)};promotedAt=(now-start)/1000;}
    }
    // Equip only genuinely owned usable drops; never create an item for this step.
    for(const unit of members())for(const slot of ['weapon','helm','armor','gloves','amulet','boots','ring1','ring2']){
      const latest=unit.uid==='hero'?game.hero:game.mercs.find(entry=>entry.uid===unit.uid);
      const item=game.inventory.filter(entry=>entry.slot===(slot.startsWith('ring')?'ring':slot)&&(entry.requiredLevel||1)<=latest.level&&score(entry)>score(latest.equip[slot])).sort((a,b)=>score(b)-score(a))[0];
      if(item)game=equipInventoryItemAction(game,item.uid,slot,unit.uid,appendGameLog);
    }
    // Buy genuine starter stock before spending the same money repeatedly on potions.
    if(starterGear!=='none')for(const unit of members())for(const slot of starterGear==='core'?['weapon','armor','helm']:['weapon','armor','helm','gloves','amulet','boots','ring1','ring2']){
      const latest=unit.uid==='hero'?game.hero:game.mercs.find(entry=>entry.uid===unit.uid);
      if(latest.equip[slot])continue;
      const spec=wearableCatalog.filter(entry=>entry.slot===(slot.startsWith('ring')?'ring':slot)).sort((a,b)=>a.price-b.price)[0];
      if(!spec)throw new Error('Missing real starter stock');
      const price=Math.floor(spec.price*city().priceFactor);
      if(game.gold<price+1000)continue;
      const before=game.gold,uid=`chapter-starter-${seed}-${serial++}`;
      game=purchaseEquipmentBatchAction(game,1,price,spec.name,()=>applyShopQuality(makeWearableEquipment(spec,uid),rollShopQuality(WEAPON_SHOP_QUALITY)),appendGameLog,setNotice);
      if(game.inventory.some(item=>item.uid===uid)){gearSpent+=before-game.gold;game=equipInventoryItemAction(game,uid,slot,unit.uid,appendGameLog);}
    }
    // Optional diagnostic policy: one paid identification per unit/real city offer.
    // Do not buy a nominal downgrade, retry quality rolls, invent stock or refund rejected rolls.
    if(cityUpgrades){
      const view=getGameView({activeTab:'city',cityService:'weapon',game,selectedUid:'hero',treasureQuery:''});
      for(const unit of members())for(const record of [...view.cityArmors,...view.cityWeapons]){
        const latest=unit.uid==='hero'?game.hero:game.mercs.find(entry=>entry.uid===unit.uid);
        const key=`${unit.uid}:${record.id}`,price=Math.floor(record.price*city().priceFactor);
        const nominalScore=(record.atk||0)+(record.def||0)+(record.hp||0)/10;
        if(attemptedCityUpgrades.has(key)||record.level>latest.level||nominalScore<=score(latest.equip[record.kind])||game.gold<price+1000)continue;
        attemptedCityUpgrades.add(key);
        const before=game.gold;
        let generated;
        game=purchaseEquipmentBatchAction(game,1,price,record.name,()=>{generated=makeOfficialEquipment(record);return generated;},appendGameLog,setNotice);
        if(!generated||!game.inventory.some(item=>item.uid===generated.uid))continue;
        gearSpent+=before-game.gold;
        const equipped=score(generated)>score(latest.equip[record.kind]);
        if(equipped)game=equipInventoryItemAction(game,generated.uid,record.kind,unit.uid,appendGameLog);
        cityPurchases.push({seconds:(now-start)/1000,unitUid:unit.uid,unitLevel:latest.level,cityId:city().id,id:record.id,requiredLevel:record.level,price,remainingGold:game.gold,rarity:generated.rarity,equipped});
      }
    }
    const potionPrice=Math.floor(600*city().priceFactor);
    if((game.medicines.healing||0)<5&&game.gold>=potionPrice+1000){
      const before=game.gold;
      const quantity=Math.min(5-(game.medicines.healing||0),Math.floor((game.gold-1000)/potionPrice));
      game=buyMedicineAction(game,'healing',quantity,city().priceFactor,city().name,appendGameLog,setNotice);
      potionSpent+=before-game.gold;
    }
    game=configureAutoPotionAction(game,{enabled:true,medicineId:'healing',threshold:50},appendGameLog);
    if(game.hero.level>=20){
      level20At??=(now-start)/1000;
      for(const unit of [game.hero,game.mercs[0]].filter(unit=>unit?.level>=20))for(const spec of equipmentAtTier(20))for(const slot of spec.slot==='ring'?['ring1','ring2']:[spec.slot]){
        const latest=unit.uid==='hero'?game.hero:game.mercs.find(entry=>entry.uid===unit.uid);
        if(latest.equip[slot]?.requiredLevel>=20)continue;
        const price=Math.floor(tierEquipmentPrice(spec)*city().priceFactor);
        if(game.gold<price+1000)continue;
        const before=game.gold,uid=`chapter-earned-${seed}-${serial++}`;
        game=purchaseTierEquipmentAction(game,spec.id,city().priceFactor,city().name,uid,appendGameLog,setNotice);
        const item=game.inventory.find(entry=>entry.uid===uid);
        if(item){gearSpent+=before-game.gold;game=equipInventoryItemAction(game,item.uid,slot,unit.uid,appendGameLog);}
      }
    }
    const prepared=game.hero.level>=20&&game.mercs[0]?.level>=20&&[game.hero,game.mercs[0]].every(unit=>Object.values(unit.equip).filter(item=>item?.requiredLevel>=20).length===8);
    if(prepared&&!bossAttempted){bossAttempted=true;begin('e_starter_pirate_king');}
    else begin(target());
  };
  try{
    Math.random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
    Date.now=()=>now;
    let nextSnapshot=start+60000;
    while(now<start+seconds*1000){
      if(phase==='trade'){
        if(now>=tradeEnd)game={...game,trade:{...game.trade,auto:false}}; // Existing UI auto toggle.
        if(!game.trade.caravan&&now<tradeEnd){const before=game.gold;game=dispatchTradeAction(game,'hanji',now,appendGameLog,[]);tradeDispatchSpent+=before-game.gold;}
        if(!game.trade.caravan&&now>=tradeEnd)phase='hunt';
      }
      if(phase==='hunt'&&game.dungeon?.status!=='recovering'){
        if(now>=nextService&&!bossAttempted){service();nextService=now+60000;}
        else if(game.dungeon?.status==='idle'&&!game.newbieBossDefeated)begin(target());
      }
      const stock=game.medicines.healing||0;
      const beforeTick=game.gold;
      now+=200;
      game=applyAutoPotionAction(settleCurrentGame(game,createGameTickRolls()),now,appendGameLog,grantXp);
      loopNetGold+=game.gold-beforeTick;
      potionsUsed+=Math.max(0,stock-(game.medicines.healing||0));
      if(game.dungeon?.status==='recovering'&&oldStatus!=='recovering')recoveries++;
      oldStatus=game.dungeon?.status;
      if(now>=nextSnapshot){snapshots.push({seconds:(now-start)/1000,phase,gold:game.gold,kills:game.kills,levels:members().map(unit=>unit.level),ranks:game.mercs.map(unit=>unit.promotionStage),status:game.dungeon?.status});nextSnapshot+=60000;}
      if(game.newbieBossDefeated)break;
    }
    return {seed,branch,tradeSeconds,starterGear,cityUpgrades,cityPurchases,elapsedSeconds:(now-start)/1000,prologueSeconds:prologue.elapsedSeconds,
      gold:game.gold,kills:game.kills,recoveries,potionsUsed,potionSpent,recruitSpent,gearSpent,trips:game.trade.trips,tradeProfit:game.trade.totalProfit,
      ledger:{initialGold:prologue.gold,loopNetGold,materialSales,tradeDispatchSpent,battleActionNetGold,
        calculatedEndingGold:prologue.gold+loopNetGold+materialSales+battleActionNetGold-tradeDispatchSpent-potionSpent-recruitSpent-gearSpent},
      promotedAt,level20At,bossAttempted,bossDefeated:game.newbieBossDefeated,materials:game.materials,notice,
      members:members().map(unit=>({level:unit.level,xp:unit.xp,promotionStage:unit.promotionStage||0,hp:unit.hp,maxHp:vitalStats(unit).maxHp,slots:Object.values(unit.equip).filter(Boolean).length,series20Slots:Object.values(unit.equip).filter(item=>item?.requiredLevel>=20).length})),snapshots,
      caveat:'Earned formal prologue state, no supplied funds/XP/seals/gear/healing. Scripted choices: optional initial hanji window, up to three total paid recruits, balanced earned points, real material sale/owned-drop equip, optional paid starter core/full stock and single-roll upgrades from actual city view stock, 50% Auto Potion with paid resupply every minute and1000 liquid reserve, first merc branch only, then paid20 gear and one Boss attempt when equipped. Expenses shown are post-prologue only. Service stops a live fight and loses unfinished damage. Manual restart after actual inn recovery is scripted, not offline continuation. Phase RNG reseeded deterministically. Action/menu/travel times beyond prologue are NOT human/browser measurements; one policy is not all-player pacing.'};
  }finally{Math.random=originalRandom;Date.now=originalDate;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(['spear','bow'].flatMap(branch=>[0,240].map(tradeSeconds=>auditFreshChapter({branch,tradeSeconds}))),null,2));
