import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const zipName = `abolivion-v${pkg.version}-gamejolt.zip`;
const zipPath = resolve(root, zipName);

if (!existsSync(dist)) {
  console.error('dist/ missing — run npm run build first');
  process.exit(1);
}

if (existsSync(zipPath)) rmSync(zipPath);

// Remove legacy unversioned zip if present
const legacy = resolve(root, 'abolivion-gamejolt.zip');
if (existsSync(legacy)) rmSync(legacy);

const isWin = process.platform === 'win32';
let result;

if (isWin) {
  const distEsc = dist.replace(/'/g, "''");
  const zipEsc = zipPath.replace(/'/g, "''");
  const ps = [
    "Add-Type -AssemblyName System.IO.Compression.FileSystem;",
    `[System.IO.Compression.ZipFile]::CreateFromDirectory('${distEsc}', '${zipEsc}');`,
  ].join(' ');
  result = spawnSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });
} else {
  result = spawnSync('zip', ['-r', zipPath, '.'], { cwd: dist, stdio: 'inherit' });
}

if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
console.log(`Created ${zipPath}`);
