/**
 * Core / Shared / Lib → Capability 정적 import 금지 검사.
 * 허용 목록: scripts/architecture-allowlist.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const allowlistPath = path.join(__dirname, 'architecture-allowlist.json');

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"\n]+from\s+)?['"]([^'"]+)['"]/g;

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

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function isTestFile(rel) {
  return /\.test\.(ts|tsx)$/.test(rel) || /\.spec\.(ts|tsx)$/.test(rel);
}

function importsCapability(specifier) {
  if (specifier.startsWith('@/capabilities/') || specifier.includes('/capabilities/')) {
    return true;
  }
  return false;
}

function loadAllowlist() {
  const raw = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  return {
    core: new Set((raw.coreMayImportCapabilities ?? []).map(toPosix)),
    shared: new Set((raw.sharedMayImportCapabilities ?? []).map(toPosix)),
    lib: new Set((raw.libMayImportCapabilities ?? []).map(toPosix)),
  };
}

function scanLayer(layerDir, layerName, allowSet) {
  const abs = path.join(root, layerDir);
  const violations = [];
  for (const file of walk(abs)) {
    const rel = toPosix(path.relative(root, file));
    if (isTestFile(rel)) continue;
    if (allowSet.has(rel)) continue;
    const text = fs.readFileSync(file, 'utf8');
    IMPORT_RE.lastIndex = 0;
    let match;
    while ((match = IMPORT_RE.exec(text))) {
      const spec = match[1];
      if (importsCapability(spec)) {
        violations.push({ file: rel, import: spec, layer: layerName });
      }
    }
  }
  return violations;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    const sample = "import x from '@/capabilities/mbo';\n";
    IMPORT_RE.lastIndex = 0;
    const m = IMPORT_RE.exec(sample);
    if (!m || !importsCapability(m[1])) {
      console.error('self-test failed: import parse');
      process.exit(1);
    }
    console.log('check-architecture-dependencies: self-test ok');
    return;
  }

  const allow = loadAllowlist();
  const violations = [
    ...scanLayer('src/core', 'core', allow.core),
    ...scanLayer('src/shared', 'shared', allow.shared),
    ...scanLayer('src/lib', 'lib', allow.lib),
  ];

  if (violations.length > 0) {
    console.error(`Architecture dependency violations (${violations.length}):`);
    for (const v of violations) {
      console.error(`  [${v.layer}] ${v.file} → ${v.import}`);
    }
    process.exit(1);
  }
  console.log('check-architecture-dependencies: ok');
}

main();
