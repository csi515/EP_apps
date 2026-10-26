/**
 * 의존성 취약점·라이선스 게이트.
 *   npm run check:deps
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const nodeModules = join(root, 'node_modules');

const ALLOWED_LICENSE_PATTERNS = [
  /^MIT$/i,
  /^MIT\/X11$/i,
  /^Apache-2\.0$/i,
  /^Apache License[, ]?Version 2\.0$/i,
  /^BSD-2-Clause$/i,
  /^BSD-3-Clause$/i,
  /^BSD$/i,
  /^ISC$/i,
  /^0BSD$/i,
  /^Unlicense$/i,
  /^CC0-1\.0$/i,
  /^CC0$/i,
  /^CC-BY-4\.0$/i,
  /^BlueOak-1\.0\.0$/i,
  /^Python-2\.0$/i,
  /^WTFPL$/i,
  /^MPL-2\.0$/i,
  /^Zlib$/i,
];

/** 라이선스 필드가 비어 있지만 관행상 허용하는 오래된 전이 패키지 */
const LICENSE_FIELD_EXCEPTIONS = new Set(['buffers']);

function tokenAllowed(token) {
  const part = token.replace(/[()]/g, '').trim();
  if (!part) return true;
  return ALLOWED_LICENSE_PATTERNS.some((re) => re.test(part));
}

function licenseAllowed(raw, packageName) {
  if (raw == null || raw === '') {
    return LICENSE_FIELD_EXCEPTIONS.has(packageName);
  }
  if (typeof raw === 'object' && !Array.isArray(raw) && raw.type) {
    return licenseAllowed(raw.type, packageName);
  }
  const text = Array.isArray(raw)
    ? raw.map((item) => (typeof item === 'string' ? item : item?.type || '')).join(' OR ')
    : String(raw);

  // OR 우선: 허용 라이선스가 하나라도 있으면 사용 가능
  if (/\s+OR\s+/i.test(text) && !/\s+AND\s+/i.test(text)) {
    return text.split(/\s+OR\s+/i).some((part) => tokenAllowed(part));
  }
  // AND: 모두 허용이어야 함
  if (/\s+AND\s+/i.test(text)) {
    return text.split(/\s+AND\s+/i).every((part) => {
      if (/\s+OR\s+/i.test(part)) {
        return part.split(/\s+OR\s+/i).some((p) => tokenAllowed(p));
      }
      return tokenAllowed(part);
    });
  }
  return tokenAllowed(text);
}

function readPackageLicense(pkgDir) {
  const pkgPath = join(pkgDir, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return {
      name: pkg.name || pkgDir,
      license: pkg.license ?? pkg.licenses ?? null,
      version: pkg.version,
    };
  } catch {
    return null;
  }
}

function walkPackages(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    if (name.name.startsWith('.')) continue;
    const full = join(dir, name.name);
    if (name.name.startsWith('@')) {
      walkPackages(full, out);
      continue;
    }
    const info = readPackageLicense(full);
    if (info) out.push(info);
    const nested = join(full, 'node_modules');
    if (existsSync(nested)) walkPackages(nested, out);
  }
  return out;
}

function checkLicenses() {
  const packages = walkPackages(nodeModules);
  const bad = [];
  for (const pkg of packages) {
    if (!licenseAllowed(pkg.license, pkg.name)) {
      bad.push(`${pkg.name}@${pkg.version || '?'}: ${JSON.stringify(pkg.license)}`);
    }
  }
  return bad;
}

function checkAudit() {
  try {
    execFileSync('npm', ['audit', '--audit-level=high'], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    });
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (!existsSync(nodeModules)) {
    console.error('check-deps: node_modules 없음. npm ci 후 다시 실행하세요.');
    process.exit(1);
  }

  console.log('check-deps: npm audit --audit-level=high');
  const auditOk = checkAudit();
  if (!auditOk) {
    console.error('check-deps: high 이상 취약점이 있습니다.');
    process.exit(1);
  }

  console.log('check-deps: license allowlist');
  const badLicenses = checkLicenses();
  if (badLicenses.length > 0) {
    console.error('check-deps: 허용되지 않은 라이선스');
    for (const row of badLicenses.slice(0, 40)) console.error(`  - ${row}`);
    if (badLicenses.length > 40) console.error(`  ... 외 ${badLicenses.length - 40}건`);
    process.exit(1);
  }

  console.log('check-deps: ok');
}

main();
