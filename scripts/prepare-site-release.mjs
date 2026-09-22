#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE_SOURCE_MAX_OBJECT_BYTES = 512 * 1024;
const RELEASE_DIRECTORY = '.site-publish';
const RELEASE_ARCHIVE = 'latest.tar.gz';
const RELEASE_MANIFEST = 'release-manifest.json';

export function parseReleaseArgs(args) {
  const options = {
    allowDirty: false,
    skipBuild: false,
  };

  for (const arg of args) {
    if (arg === '--allow-dirty') options.allowDirty = true;
    else if (arg === '--skip-build') options.skipBuild = true;
    else throw new Error(`Unknown release option: ${arg}`);
  }

  return options;
}

export function parseLsTree(output) {
  return output
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(blob)\s+([0-9a-f]+)\s+(\d+)\t(.+)$/);
      if (!match) throw new Error(`Could not parse Git tree entry: ${line}`);

      return {
        mode: match[1],
        type: match[2],
        objectId: match[3],
        size: Number(match[4]),
        path: match[5],
      };
    });
}

export function selectReleaseEntries(entries, maxObjectBytes = SITE_SOURCE_MAX_OBJECT_BYTES) {
  const included = [];
  const excluded = [];

  for (const entry of entries) {
    (entry.size <= maxObjectBytes ? included : excluded).push(entry);
  }

  return { included, excluded };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed.\n${result.stderr || result.stdout || ''}`);
  }

  return result.stdout ?? '';
}

function git(root, args, options = {}) {
  return run('git', args, { ...options, cwd: root }).trim();
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function ensureCleanWorktree(root, allowDirty) {
  const status = git(root, ['status', '--porcelain=v1']);
  if (status && !allowDirty) {
    throw new Error(
      'Refusing to create a release from uncommitted files. Commit or stash the changes first, then rerun. Use --allow-dirty only for local diagnostics.',
    );
  }
}

function buildProject(root, skipBuild) {
  if (skipBuild) return;
  run(npmCommand(), ['run', 'build'], { cwd: root, stdio: 'inherit' });
}

function createArchive(root) {
  const distDirectory = join(root, 'dist');
  if (!existsSync(join(distDirectory, '.openai', 'hosting.json')) || !existsSync(join(distDirectory, 'server', 'wrangler.json'))) {
    throw new Error('Missing Sites build output in dist/. Run the build before packaging.');
  }

  const releaseDirectory = join(root, RELEASE_DIRECTORY);
  mkdirSync(releaseDirectory, { recursive: true });
  const archivePath = join(releaseDirectory, RELEASE_ARCHIVE);
  rmSync(archivePath, { force: true });
  run('tar', ['-czf', archivePath, 'dist'], { cwd: root });
  return archivePath;
}

function createSourceSnapshot(root, sourceCommit) {
  const gitDirectoryValue = git(root, ['rev-parse', '--git-dir']);
  const gitDirectory = isAbsolute(gitDirectoryValue)
    ? gitDirectoryValue
    : resolve(root, gitDirectoryValue);
  const indexPath = join(gitDirectory, `.site-release-${process.pid}-${Date.now()}.index`);
  const env = { ...process.env, GIT_INDEX_FILE: indexPath };

  try {
    git(root, ['read-tree', '--empty'], { env });
    const entries = parseLsTree(Buffer.from(git(root, ['-c', 'core.quotepath=false', 'ls-tree', '-r', '-l', '-z', sourceCommit]), 'utf8'));
    const { included, excluded } = selectReleaseEntries(entries);

    for (let start = 0; start < included.length; start += 100) {
      const batch = included.slice(start, start + 100);
      const args = ['update-index', '--add'];
      for (const entry of batch) {
        args.push('--cacheinfo', `${entry.mode},${entry.objectId},${entry.path}`);
      }
      git(root, args, { env });
    }

    const tree = git(root, ['write-tree'], { env });
    const snapshotCommit = git(root, [
      '-c', 'user.name=Gersang Site Release',
      '-c', 'user.email=release@local.invalid',
      'commit-tree',
      tree,
      '-m',
      `Site release source snapshot for ${sourceCommit.slice(0, 7)}`,
    ]);
    git(root, ['update-ref', 'refs/site-release/latest', snapshotCommit]);

    return {
      snapshotCommit,
      includedFiles: included.length,
      excludedFiles: excluded.length,
      excludedBytes: excluded.reduce((total, entry) => total + entry.size, 0),
    };
  } finally {
    rmSync(indexPath, { force: true });
    rmSync(`${indexPath}.lock`, { force: true });
  }
}

export function prepareSiteRelease(root, options) {
  ensureCleanWorktree(root, options.allowDirty);
  const sourceCommit = git(root, ['rev-parse', 'HEAD']);
  buildProject(root, options.skipBuild);
  const archivePath = createArchive(root);
  const snapshot = createSourceSnapshot(root, sourceCommit);
  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    sourceCommit,
    siteSourceCommit: snapshot.snapshotCommit,
    sourceObjectLimitBytes: SITE_SOURCE_MAX_OBJECT_BYTES,
    includedSourceFiles: snapshot.includedFiles,
    excludedLargeSourceFiles: snapshot.excludedFiles,
    excludedLargeSourceBytes: snapshot.excludedBytes,
    archivePath: `${RELEASE_DIRECTORY}/${RELEASE_ARCHIVE}`,
    archiveBytes: statSync(archivePath).size,
  };
  const manifestPath = join(root, RELEASE_DIRECTORY, RELEASE_MANIFEST);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return { manifest, manifestPath };
}

function main() {
  const root = git(process.cwd(), ['rev-parse', '--show-toplevel']);
  const { manifest, manifestPath } = prepareSiteRelease(root, parseReleaseArgs(process.argv.slice(2)));
  console.log(`Release package ready: ${manifest.archivePath}`);
  console.log(`GitHub source: ${manifest.sourceCommit}`);
  console.log(`Sites source snapshot: ${manifest.siteSourceCommit}`);
  console.log(`Manifest: ${manifestPath}`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) main();
