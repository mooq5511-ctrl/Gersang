import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SITE_SOURCE_MAX_OBJECT_BYTES,
  parseLsTree,
  parseReleaseArgs,
  selectReleaseEntries,
} from '../scripts/prepare-site-release.mjs';

test('parses nul-delimited Git tree entries without losing Unicode paths', () => {
  const entries = parseLsTree(Buffer.from(
    '100644 blob abcdef123456 12\tapp/game.tsx\0' +
      '100644 blob 123456abcdef 99\t專案備忘錄/開發.md\0',
  ));

  assert.deepEqual(entries, [
    { mode: '100644', type: 'blob', objectId: 'abcdef123456', size: 12, path: 'app/game.tsx' },
    { mode: '100644', type: 'blob', objectId: '123456abcdef', size: 99, path: '專案備忘錄/開發.md' },
  ]);
});

test('keeps source objects at or under the safe release limit', () => {
  const entries = [
    { path: 'small.ts', size: SITE_SOURCE_MAX_OBJECT_BYTES },
    { path: 'large.png', size: SITE_SOURCE_MAX_OBJECT_BYTES + 1 },
  ];

  const { included, excluded } = selectReleaseEntries(entries);
  assert.deepEqual(included.map((entry) => entry.path), ['small.ts']);
  assert.deepEqual(excluded.map((entry) => entry.path), ['large.png']);
});

test('requires an explicit diagnostic flag for a dirty release and rejects unknown flags', () => {
  assert.deepEqual(parseReleaseArgs(['--allow-dirty', '--skip-build']), {
    allowDirty: true,
    skipBuild: true,
  });
  assert.throws(() => parseReleaseArgs(['--publish-now']), /Unknown release option/);
});
