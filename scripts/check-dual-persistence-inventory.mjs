/**
 * capabilities 이중 영속(localStorage·데모/오프라인 env) 인벤토리 계약.
 * 실행: npm run test:dual-persistence-inventory
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const allowlistPath = path.join(__dirname, 'dual-persistence-allowlist.json');

const LOCAL_STORAGE_RE = /\blocalStorage\b/;
const VITE_DEMO_RE = /VITE_[A-Z0-9_]*DEMO[A-Z0-9_]*/i;
const VITE_OFFLINE_RE = /VITE_[A-Z0-9_]*OFFLINE[A-Z0-9_]*/i;

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function isTestFile(rel) {
  return /\.test\.(ts|tsx)$/.test(rel) || /\.spec\.(ts|tsx)$/.test(rel);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

function matchesDualPersistence(text) {
  return LOCAL_STORAGE_RE.test(text) || VITE_DEMO_RE.test(text) || VITE_OFFLINE_RE.test(text);
}

function scanCapabilities() {
  const capDir = path.join(root, 'src/capabilities');
  const paths = [];
  for (const file of walk(capDir)) {
    const rel = toPosix(path.relative(root, file));
    if (isTestFile(rel)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (matchesDualPersistence(text)) paths.push(rel);
  }
  return [...new Set(paths)].sort();
}

function loadAllowlist() {
  const raw = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  return [...new Set((raw.paths ?? []).map(toPosix))].sort();
}

function main() {
  const found = scanCapabilities();
  const allowed = loadAllowlist();
  const allowedSet = new Set(allowed);
  const novel = found.filter((p) => !allowedSet.has(p));
  const stale = allowed.filter((p) => !found.includes(p));

  console.log(`dual-persistence inventory: ${found.length} path(s)`);
  for (const p of found) {
    const tag = allowedSet.has(p) ? 'allowlisted' : 'NEW';
    console.log(`  [${tag}] ${p}`);
  }

  if (stale.length > 0) {
    console.warn(`\nStale allowlist entries (no longer match scan): ${stale.length}`);
    for (const p of stale) console.warn(`  ${p}`);
  }

  if (novel.length > 0) {
    console.error(`\ncheck-dual-persistence-inventory: FAIL — ${novel.length} new path(s)`);
    process.exit(1);
  }

  console.log('check-dual-persistence-inventory: ok');
}

main();