"use client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { TabsContent } from "@/components/ui/tabs";
import { BedDouble,Gem,Map,PackageOpen,Pill,Shield,ShoppingBag,Swords,Users,Warehouse } from "lucide-react";
import { type EquipmentSlot } from './equipment-slots';
import { medicineCatalog } from "./game-config";
import { formations,mercenaries } from "./game-data";
import { formatGameNumber as format } from "./game-display";
import { slotLabels,slots } from './game-ui-config';
import { GeneralRecruitment } from './general-recruitment';
import { cuteEquipmentArt,gersangBuildingArt,gersangItemArt } from './gersang-visuals';
import { warehouseLimit } from './guild-territory';
import { hanyangRecruitmentCost,recommendedMercenaryIds } from "./hanyang-prologue";
import { MercenaryRecruitment } from './mercenary-recruitment';
import { EquipmentPurchaseControl } from './equipment-purchase-control';
import { tierEquipmentPrice,tierEquipmentShopCatalog } from "./tier-equipment";
import type { GameViewModel } from './use-game-controller';
import { nations,worldCities } from "./v15-data";
import { officialGems } from "./v17-content";
import { MATERIAL_BUY_PRICES,VILLAGE_WEAPONS,exchangeAttackBonus,weaponCost } from './village-exchange';
import { wearableCatalog } from './wearable-catalog';

type Props = Pick<GameViewModel, "buyExchangeUpgrade" | "buyLootMaterial" | "buyMagicEquipment" | "buyMedicine" | "buyOfficialItem" | "buyTierEquipment" | "buyWearable" | "cityArmors" | "cityService" | "cityWeapons" | "consumeMedicine" | "craftRelicEquipment" | "currentCity" | "currentNation" | "currentWorldZone" | "depositToWarehouse" | "game" | "gemAmount" | "gemSlot" | "medicineAmounts" | "quickHealCost" | "recruitGeneral" | "recruitMerchant" | "restAtInn" | "selected" | "setCityService" | "setGame" | "setGemAmount" | "setGemSlot" | "setMedicineAmounts" | "sharedWarehouse" | "shopPurchaseFeedback" | "socketGem" | "travelToCity" | "withdrawFromWarehouse">;

export function GameCityPage({ buyExchangeUpgrade, buyLootMaterial, buyMagicEquipment, buyMedicine, buyOfficialItem, buyTierEquipment, buyWearable, cityArmors, cityService, cityWeapons, consumeMedicine, craftRelicEquipment, currentCity, currentNation, currentWorldZone, depositToWarehouse, game, gemAmount, gemSlot, medicineAmounts, quickHealCost, recruitGeneral, recruitMerchant, restAtInn, selected, setCityService, setGame, setGemAmount, setGemSlot, setMedicineAmounts, sharedWarehouse, shopPurchaseFeedback, socketGem, travelToCity, withdrawFromWarehouse }: Props) {
return (<TabsContent value="city" className="tab-panel">
          <section className="panel city-atlas">
            <div className="panel-title"><Map /><h2>四國主城</h2><span>朝鮮漢陽・中國南京・日本江戶・台灣台北</span></div>
            <div className="city-country-grid">{nations.map((nation) => <article key={nation.id} style={{ "--nation-color": nation.color } as React.CSSProperties}>
              <div><strong>{nation.name}</strong><small>{nation.description}</small></div>
              <div>{worldCities.filter((city) => city.nation === nation.id).map((city) => {
                const origin = worldCities.find((entry) => entry.id === game.city) || worldCities[0];
                const travelCost = origin.nation === city.nation ? Math.floor(city.travelFee * 0.45) : city.travelFee;
                return <button key={city.id} className={game.city === city.id ? "active" : ""} onClick={() => travelToCity(city.id)}><span>{city.name}</span><small>{game.city === city.id ? "所在地" : format(travelCost) + " 兩"}</small></button>;
              })}</div>
            </article>)}</div>
          </section>

          <section className="panel city-hall" style={{ "--nation-color": currentNation.color } as React.CSSProperties}>
            <div className="city-heading"><div><small>{currentNation.name}・特產 {currentCity.specialty}</small><h2>{currentCity.name}</h2><p>本城設施獨立營業，招募名單、將領與裝備庫存皆依城市不同。</p></div><img className="city-building-art" src={gersangBuildingArt(currentNation.id, cityService)} alt={`${currentCity.name}${cityService}`} /></div>
            <div className="city-service-tabs">
              <button className={cityService === "mercenary" ? "active" : ""} onClick={() => setCityService("mercenary")}><Users />中央傭兵公會</button>
              <button className={cityService === "weapon" ? "active" : ""} onClick={() => setCityService("weapon")}><Swords />武器商店</button>
              <button className={cityService === "armor" ? "active" : ""} onClick={() => setCityService("armor")}><Shield />防具商店</button>
              <button className={cityService === "warehouse" ? "active" : ""} onClick={() => setCityService("warehouse")}><Warehouse />倉庫</button>
              <button className={cityService === "inn" ? "active" : ""} onClick={() => setCityService("inn")}><BedDouble />客棧</button>
              <button className={cityService === "pharmacy" ? "active" : ""} onClick={() => setCityService("pharmacy")}><Pill />藥店</button>
              <button className={cityService === "exchange" ? "active" : ""} onClick={() => setCityService("exchange")}><PackageOpen />全東亞材料交易所</button>
            </div>

            {cityService === 'mercenary' && <><MercenaryRecruitment gold={game.gold} creditLevel={game.creditLevel} mercs={game.mercs} cost={hanyangRecruitmentCost(game, Math.floor(6000 * currentCity.priceFactor))} recommendedIds={game.hanyangPrologueStep === 'guild' ? recommendedMercenaryIds() : []} recruit={recruitMerchant} /><GeneralRecruitment generals={mercenaries.filter(general => general.grade === 'general' && general.city === currentCity.name)} gold={game.gold} recruit={recruitGeneral} /></>}

            {(cityService === "weapon" || cityService === "armor") && <div className="city-service-body"><div className="panel-title">{cityService === "weapon" ? <Swords /> : <Shield />}<h2>{currentCity.name}{cityService === "weapon" ? "武器商店" : "防具商店"}</h2><span>本城獨立庫存</span></div><p className="shop-quality-notice">購入時隨機鑑定：普通 64.5%（×1）・稀有 30%（×1.5）・史詩 5%（×10）・傳說 0.5%（×150）；未命中高階品時以普通品質出貨。</p>
              <div className="official-item-grid">{(cityService === "weapon" ? cityWeapons : cityArmors).map((record) => {
                const price = Math.floor(record.price * currentCity.priceFactor);
                return <article key={record.id} className={shopPurchaseFeedback === `official:${record.id}` ? "shop-purchase-flash" : undefined}><img src={cuteEquipmentArt(record.name,gersangItemArt(record.kind === "weapon" ? "weapon" : "armor"))} alt="" /><small>Lv.{record.level}・{record.kind === "weapon" ? "武器" : "防具"}</small><strong>{record.name}</strong><span>{record.atk ? "攻 " + record.atk : "防 " + record.def}{record.skill ? "・" + record.skill : ""}</span><em>{[record.str ? "力+" + record.str : "", record.agi ? "敏+" + record.agi : "", record.intel ? "智+" + record.intel : "", record.vit ? "體+" + record.vit : ""].filter(Boolean).join("・") || "基礎裝備"}</em><EquipmentPurchaseControl name={record.name} unitPrice={price} gold={game.gold} onPurchase={quantity => buyOfficialItem(record, price, quantity)} /></article>;
              })}</div>
              <div className="official-item-grid">{wearableCatalog.filter(item=>cityService==='weapon'?['weapon','ring','amulet'].includes(item.slot):!['weapon','ring','amulet'].includes(item.slot)).map(item=><article key={item.id} className={shopPurchaseFeedback === `wearable:${item.id}` ? "shop-purchase-flash" : undefined}><img src={gersangItemArt(item.slot)} alt="" /><small>{slotLabels[item.slot]}</small><strong>{item.name}</strong><span>攻 {item.atk} · 防 {item.def} · HP {item.hp}</span><EquipmentPurchaseControl name={item.name} unitPrice={Math.floor(item.price*currentCity.priceFactor)} gold={game.gold} onPurchase={quantity => buyWearable(item, quantity)} /></article>)}</div>
              <p className="shop-quality-notice">過渡供應：Lv.120／150／180／200 系列裝備，達到等級後可購買；後續地圖完成將調整取得來源。</p>
              <div className="official-item-grid">{tierEquipmentShopCatalog.filter(item=>cityService==='weapon'?item.part==='weapon':item.part!=='weapon').map(item=><article key={item.id} className={shopPurchaseFeedback === `tier:${item.id}` ? "shop-purchase-flash" : undefined}><img src={item.image} alt="" /><small>Lv.{item.requiredLevel}・{item.partLabel}</small><strong>{item.name}</strong><span>攻 {item.atk} · 防 {item.def} · HP {item.hp}</span><EquipmentPurchaseControl name={item.name} unitPrice={Math.floor(tierEquipmentPrice(item)*currentCity.priceFactor)} gold={game.gold} lockedLabel={game.hero.level<item.requiredLevel?`Lv.${item.requiredLevel} 開放`:undefined} onPurchase={quantity => buyTierEquipment(item, quantity)} /></article>)}</div>
              {cityService === "weapon" && <div className={shopPurchaseFeedback === "magic-equipment" ? "enchant-counter shop-purchase-flash" : "enchant-counter"}><div><strong>附魔裝備櫃</strong><p>購入與目前關卡相符、附帶 1～3 條魔法屬性的隨機裝備。</p></div><Button onClick={buyMagicEquipment}><ShoppingBag />12,000 兩</Button></div>}
            </div>}

            {cityService === "warehouse" && <div className="city-service-body warehouse-service"><div className="panel-title"><Warehouse /><h2>三角色共用倉庫</h2><span>{sharedWarehouse.length}/{warehouseLimit(game.territory)} 格</span></div><Progress value={sharedWarehouse.length / warehouseLimit(game.territory) * 100} />
              <div className="warehouse-columns"><section><h3>{game.hero.name} 的物品欄</h3>{game.inventory.length ? game.inventory.map((item) => <article key={item.uid}><img src={item.image} alt="" /><span><strong>{item.name}</strong><small>{item.rarity}・{slotLabels[item.slot]}</small></span><Button size="sm" disabled={sharedWarehouse.length >= warehouseLimit(game.territory)} onClick={() => depositToWarehouse(item.uid)}>存入</Button></article>) : <p>目前沒有可存入的裝備。</p>}</section>
              <section><h3>共用倉庫・三名角色皆可取用</h3>{sharedWarehouse.length ? sharedWarehouse.map((item) => <article key={item.uid}><img src={item.image} alt="" /><span><strong>{item.name}</strong><small>{item.rarity}・{slotLabels[item.slot]}</small></span><Button size="sm" variant="outline" onClick={() => withdrawFromWarehouse(item.uid)}>取出</Button></article>) : <p>倉庫目前是空的。</p>}</section></div>
            </div>}

            {cityService === "inn" && <div className="city-service-body inn-service"><BedDouble /><div><small>{currentCity.name}客棧</small><h2>商團歇腳與修練</h2><p>全員 HP / MP 恢復至上限；主角獲得 700 經驗，出戰傭兵各獲得 550 經驗。</p><Button type="button" onClick={restAtInn}>{game.hero.status==='客棧中'||game.dungeon?.status==='recovering'?'立即療傷・'+format(quickHealCost)+' 兩':'入住・'+format(Math.floor(1800 * currentCity.priceFactor))+' 兩'}</Button></div></div>}

            {cityService === "pharmacy" && <div className="city-service-body"><div className="panel-title"><Pill /><h2>{currentCity.name}藥店</h2><span>可設定每次購買數量</span></div><div className="medicine-grid">{medicineCatalog.filter(medicine => (medicine as { shop?: boolean }).shop !== false).map((medicine) => {const amount=medicineAmounts[medicine.id]||1;const unitPrice=Math.floor(medicine.price * currentCity.priceFactor);return <article key={medicine.id} className={shopPurchaseFeedback === `medicine:${medicine.id}` ? "shop-purchase-flash" : undefined}><Pill /><div><strong>{medicine.name}</strong><small>{medicine.effect}</small><em>持有 {game.medicines[medicine.id] || 0} ・單價 {format(unitPrice)} 兩</em></div><div className="medicine-purchase"><label>數量<input aria-label={`${medicine.name}購買數量`} type="number" min="1" max="999" value={amount} onChange={event=>setMedicineAmounts(previous=>({...previous,[medicine.id]:Math.min(999,Math.max(1,Math.floor(Number(event.target.value)||1)))}))}/></label><Button size="sm" onClick={() => buyMedicine(medicine.id,amount)}>購買 {format(unitPrice*amount)} 兩</Button></div><Button size="sm" variant="outline" disabled={!game.medicines[medicine.id]} onClick={() => consumeMedicine(medicine.id)}>使用</Button></article>;})}</div></div>}

            {cityService === "exchange" && <div className="city-service-body village-exchange"><div className="panel-title"><PackageOpen /><h2>全東亞材料交易所</h2><span>永久攻擊 +{exchangeAttackBonus(game.exchangePurchases)}</span></div><div className="exchange-layout"><div className="exchange-weapons"><div className="exchange-subtitle"><strong>{currentCity.name}鍛造所</strong><small>可重複購買，每次漲價 30%</small></div><div className="weapon-upgrade-grid">{VILLAGE_WEAPONS.map(good=>{const cost=weaponCost(good.id,game.exchangePurchases),bought=game.exchangePurchases[good.id]||0;return <article key={good.id} className={good.id==='immortal-great-blade'?'divine':''}><div><strong>{good.name}</strong><small>主角永久攻擊 +{good.atkBonus}｜已鍛造 {bought} 次</small></div><button onClick={()=>buyExchangeUpgrade(good.id)} disabled={game.gold<cost}>🪙 {format(cost)} 兩</button></article>;})}</div></div><div className="exchange-market"><div className="exchange-subtitle"><strong>本地材料櫃檯</strong><small>{currentWorldZone.name}・可買回本地怪物材料</small><small>材料請至商隊背包出售。</small></div><div className="material-market-grid">{currentWorldZone.dropTable.map(item=>{const price=MATERIAL_BUY_PRICES[item.item]||0;return <article key={item.item} className={shopPurchaseFeedback === `material:${item.item}` ? "shop-purchase-flash" : undefined}><div><strong>{item.item}</strong><small>持有 ×{game.materials[item.item]||0}・買價 {format(price)} 兩</small></div><button type="button" disabled={!price||game.gold<price} onClick={()=>buyLootMaterial(item.item)}>買入 1 件</button></article>;})}</div></div></div><section className="relic-forge-card"><div><strong>遺跡鍛造台</strong><p>消耗遺跡材料與碎片，鍛造一件保底稀有度的特殊裝備。</p><small>費用：15,000 兩・遺跡材料 {game.materials["遺跡材料"] || 0}/12・遺跡碎片 {game.materials["遺跡碎片"] || 0}/2</small></div><button type="button" disabled={game.gold < 15000 || (game.materials["遺跡材料"] || 0) < 12 || (game.materials["遺跡碎片"] || 0) < 2} onClick={craftRelicEquipment}>鍛造特殊裝備</button></section></div>}
          </section>

          <div className="city-auxiliary">
            <section className="panel gem-workshop"><div className="panel-title"><Gem /><h2>寶石鑲嵌工房</h2><span>目前對象・{selected.name}</span></div><Select value={gemSlot} onValueChange={value=>{if(value) setGemSlot(value as EquipmentSlot)}}><SelectTrigger aria-label="選擇鑲嵌欄位"><SelectValue>{slotLabels[gemSlot]}</SelectValue></SelectTrigger><SelectContent>{slots.map(slot=><SelectItem key={slot} value={slot}>{slotLabels[slot]}</SelectItem>)}</SelectContent></Select><label className="gem-amount">鑲嵌數量（1～100）<input aria-label="寶石鑲嵌數量" type="number" min="1" max="100" value={gemAmount} onChange={event=>setGemAmount(Math.min(100,Math.max(1,Math.floor(Number(event.target.value)||1))))}/></label><div className="gem-grid">{officialGems.map((gem) => <article key={gem.id}><strong>{gem.name}</strong><small>{gem.label}</small><div>{gem.values.map((value, grade) => <Button key={grade} size="sm" variant="outline" onClick={() => socketGem(gem.id, grade, gemAmount)}>+{value}・{format(gem.costs[grade])}兩</Button>)}</div></article>)}</div></section>
            <section className="panel"><div className="panel-title"><Shield /><h2>陣法</h2></div><div className="formation-list">{formations.map((item) => <button key={item.id} className={game.formation === item.id ? "formation-row active" : "formation-row"} onClick={() => setGame((prev) => ({ ...prev, formation: item.id }))}><span><strong>{item.name}</strong><small>{item.detail}</small></span><em>{game.formation === item.id ? "使用中" : "切換"}</em></button>)}</div></section>
          </div>
        </TabsContent>);
}
