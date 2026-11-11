/**
 * domain 마이그레이션 SQL 정적 점검.
 * - 번호 연속성 / 중복
 * - 위험 패턴(auth.uid, supabase 전용)
 * - 달러 쿼트 태그 짝
 *
 * 실행: npm run check:migration-syntax
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.cwd(), 'migrations/domain');
const errors = [];

if (!fs.existsSync(dir)) {
  console.error('check-migration-syntax: FAIL');
  console.error(' - migrations/domain 없음');
  process.exit(1);
}

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b, 'en'));

if (files.length === 0) {
  errors.push('migrations/domain/*.sql 없음');
}

const nums = [];
for (const file of files) {
  const m = file.match(/^(\d{3})_/);
  if (!m) {
    errors.push(`${file}: 파일명은 NNN_*.sql 형식이어야 함`);
    continue;
  }
  nums.push(Number(m[1]));
  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  if (!sql.trim()) {
    errors.push(`${file}: 빈 파일`);
  }
  if (/auth\.uid\s*\(/i.test(sql)) {
    errors.push(`${file}: auth.uid() 사용 금지 (app.current_user_id 사용)`);
  }
  if (/CREATE\s+TABLE\s+bath\./i.test(sql) || /sauna_jjimjilbang/i.test(sql)) {
    errors.push(`${file}: 레거시 bath/사우나 스키마 금지`);
  }
  const dollars = sql.match(/\$[A-Za-z0-9_]*\$/g) ?? [];
  if (dollars.length % 2 !== 0) {
    errors.push(`${file}: 달러 쿼트 태그 짝이 맞지 않음`);
  }
}

const sorted = [...nums].sort((a, b) => a - b);
for (let i = 0; i < sorted.length; i += 1) {
  if (i > 0 && sorted[i] === sorted[i - 1]) {
    errors.push(`중복 번호: ${String(sorted[i]).padStart(3, '0')}`);
  }
  if (i > 0 && sorted[i] !== sorted[i - 1] + 1) {
    errors.push(
      `번호 공백: ${String(sorted[i - 1]).padStart(3, '0')} → ${String(sorted[i]).padStart(3, '0')}`
    );
  }
}

if (errors.length) {
  console.error('check-migration-syntax: FAIL');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log(
  `check-migration-syntax: ok (${files.length} files, ${String(sorted[0]).padStart(3, '0')}–${String(sorted.at(-1)).padStart(3, '0')})`
);
