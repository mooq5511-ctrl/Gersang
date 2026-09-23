/** 顯示層轉換：只讀取品階，不修改物品、存檔或掉落機率。 */
export function rarityPresentation(rarity?:string){
 switch(rarity){
  case '優良':return {className:'rarity-uncommon',label:'優良'};
  case '稀有':return {className:'rarity-uncommon',label:'綠色・稀有'};
  case '史詩':return {className:'rarity-epic',label:'藍色・史詩'};
  case '傳說':return {className:'rarity-mythic',label:'紫色・傳說'};
  case '金色':return {className:'rarity-gold',label:'金色'};
  default:return {className:'rarity-common',label:'白色・普通'};
 }
}
/** 將強化等級轉成顯示徽章所需的樣式；僅做顯示，不修改裝備資料。 */
export function enhancementPresentation(level?:number){
 const safeLevel=Math.max(0,Math.floor(level||0));
 if(safeLevel<=0)return {className:'',label:''};
 const className=safeLevel>=10?'enhance-level-10':safeLevel>=9?'enhance-level-9':safeLevel>=7?'enhance-level-7':safeLevel>=4?'enhance-level-4':'enhance-level-1';
 return {className,label:`+${safeLevel}`};
}
/** 舊存檔日誌仍是純文字；分類時先判斷失敗，避免把「掉落無法拾取」誤標成獎勵。 */
export function battleLogPresentation(line:string){
 if(/全滅|無法拾取|背包已滿/.test(line))return {className:'log-lose',label:'警示'};
 if(/成功擊敗/.test(line))return {className:'log-win',label:'勝利'};
 if(/獲得「|掉落.*裝備/.test(line))return {className:'log-drop',label:'掉寶'};
 if(/施放|蛇龍出水/.test(line))return {className:'log-skill',label:'技能'};
 if(/傳送|療傷|撤回|再次現身/.test(line))return {className:'log-travel',label:'動態'};
 return {className:'log-normal',label:'交鋒'};
}
