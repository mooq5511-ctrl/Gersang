/** Socket affixes describe flat bonuses already stored in item.bonus, not percentages. */
export function isSocketGemDisplayAffix(item: { socketGem?: { id: string } }, affix: { id?: string }) {
  return !!item.socketGem && affix.id === `socket-${item.socketGem.id}`;
}

/** Use preserved socket identity; never guess an original name from generated '+N' titles. */
export function equipmentBaseName(item: { name?: string; socketGem?: { baseName?: string } }) {
  const name = typeof item.socketGem?.baseName === 'string' && item.socketGem.baseName
    ? item.socketGem.baseName : typeof item.name === 'string' ? item.name : '';
  return name.replace(/^(普通|稀有|史詩|傳說|金色)・/, '');
}
