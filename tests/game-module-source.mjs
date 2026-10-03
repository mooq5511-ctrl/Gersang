import { readFileSync } from 'node:fs';

// Source-level integration assertions inspect the responsible modules, not a
// former monolith. Runtime and architectural tests verify they remain wired.
export function readGameModules(...files) {
  return files.map(file => readFileSync(new URL(`../app/${file}`, import.meta.url), 'utf8')).join('\n');
}
