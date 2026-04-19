/**
 * Produces a single-file Windows executable using Node.js Single Executable Applications (SEA).
 * Requires Node 21+ and only works on the current platform.
 *
 * Usage: node scripts/sea-build.mjs
 *
 * Output: notified.exe (Windows) / notified (Linux/macOS)
 */

import { spawnSync } from 'node:child_process';
import { cpSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const bundlePath = join(rootDir, 'bundle', 'index.js');
const seaConfig = join(rootDir, 'sea-config.json');
const seaBlob = join(rootDir, 'sea-prep.blob');
const isWin = process.platform === 'win32';
const outExe = join(rootDir, isWin ? 'notified.exe' : 'notified');

if (!existsSync(bundlePath)) {
  console.error('bundle/index.js not found – run `npm run bundle` first.');
  process.exit(1);
}

writeFileSync(
  seaConfig,
  JSON.stringify({
    main: bundlePath,
    output: seaBlob,
    disableExperimentalSEAWarning: true,
  }),
  'utf8',
);

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

console.log('Generating SEA blob…');
// Use the Node.js binary path only – it's the current interpreter, not user input
run(process.execPath, ['--experimental-sea-config', seaConfig]);

console.log(`Copying node binary to ${outExe}…`);
cpSync(process.execPath, outExe);

const FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

if (isWin) {
  console.log('Injecting blob into exe…');
  run('npx', ['postject', outExe, 'NODE_SEA_BLOB', seaBlob, '--sentinel-fuse', FUSE]);
} else {
  console.log('Injecting blob…');
  run('npx', [
    'postject', outExe, 'NODE_SEA_BLOB', seaBlob,
    '--sentinel-fuse', FUSE,
    '--macho-segment-name', 'NODE_SEA',
  ]);
}

console.log(`\n✓ Built: ${outExe}`);
