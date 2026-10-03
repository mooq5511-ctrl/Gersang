import { gameplayContracts as legacyContracts } from './v17-content';

export const gameplayContracts = legacyContracts.filter(contract => !['tier1', 'tier2', 'awakened'].includes(contract.metric));
