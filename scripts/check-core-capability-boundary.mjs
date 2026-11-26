/**
 * Core → @/capabilities import 경계 (R0: KNOWN DEBT 게이트, R2: import 0).
 * 실행: npm run test:core-capability-boundary
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const allowlistPath = path.join(__dirname, 'core-capability-boundary-allowlist.json');

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"\n]+from\s+)?['"]([^'"]+)['"]/g;

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function isTestFile(rel) {
  return /\.test\.(ts|tsx)$/.test(rel) || /\.spec\.(ts|tsx)$/.test(rel);
}

function importsCapabilities(specifier) {
  return specifier.startsWith('@/capabilities/');
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

function loadAllowlist() {
  const raw = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  return new Set((raw.coreMayImportCapabilities ?? []).map(toPosix));
}

function scanCore() {
  const coreDir = path.join(root, 'src/core');
  const hits = [];
  for (const file of walk(coreDir)) {
    const rel = toPosix(path.relative(root, file));
    if (isTestFile(rel)) continue;
    const text = fs.readFileSync(file, 'utf8');
    IMPORT_RE.lastIndex = 0;
    let match;
    const specs = new Set();
    while ((match = IMPORT_RE.exec(text))) {
      const spec = match[1];
      if (importsCapabilities(spec)) specs.add(spec);
    }
    if (specs.size > 0) {
      hits.push({ file: rel, imports: [...specs].sort() });
    }
  }
  return hits.sort((a, b) => a.file.localeCompare(b.file));
}

function main() {
  const allow = loadAllowlist();
  const hits = scanCore();

  if (hits.length === 0) {
    console.log('check-core-capability-boundary: ok (no Core→@/capabilities imports)');
    return;
  }

  const known = [];
  const novel = [];
  for (const row of hits) {
    if (allow.has(row.file)) known.push(row);
    else novel.push(row);
  }

  console.log(`Core→@/capabilities imports: ${hits.length} file(s) (R2 KNOWN DEBT until allowlist empty)`);
  for (const row of known) {
    console.log(`  [allowlisted] ${row.file}`);
    for (const spec of row.imports) console.log(`    → ${spec}`);
  }
  for (const row of novel) {
    console.log(`  [NEW] ${row.file}`);
    for (const spec of row.imports) console.log(`    → ${spec}`);
  }

  if (novel.length > 0) {
    console.error(`\ncheck-core-capability-boundary: FAIL — ${novel.length} file(s) outside allowlist`);
    process.exit(1);
  }

  console.log('check-core-capability-boundary: ok (known debt only)');
}

main();