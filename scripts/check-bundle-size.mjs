/**
 * dist/assets JS gzip 합계 한도 검사.
 * build 직후 실행: npm run check:bundle-size
 *
 * LIMIT_BYTES 는 기준 빌드 gzip 합계의 약 110%다.
 * 기준을 갱신할 때는 빌드 후 스크립트가 출력하는 suggested 값을 반영한다.
 */
import { createGzip } from 'node:zlib';
import { promisify } from 'node:util';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream';
import { Readable } from 'node:stream';

const pipe = promisify(pipeline);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const assetsDir = join(root, 'dist', 'assets');

/** EP_apps 기준 빌드 JS gzip 합계의 110% (bytes). 2026-10-26 측정 ≈479 KiB → 한도 ≈514 KiB. */
const LIMIT_BYTES = Number(process.env.BUNDLE_SIZE_LIMIT_BYTES || 526_387);

async function gzipSize(buf) {
  const chunks = [];
  const gzip = createGzip({ level: 9 });
  gzip.on('data', (c) => chunks.push(c));
  await pipe(Readable.from(buf), gzip);
  return Buffer.concat(chunks).length;
}

async function main() {
  if (!existsSync(assetsDir)) {
    console.error('check-bundle-size: dist/assets 없음. npm run build 후 실행하세요.');
    process.exit(1);
  }

  const files = readdirSync(assetsDir).filter((name) => name.endsWith('.js'));
  if (files.length === 0) {
    console.error('check-bundle-size: dist/assets 에 JS 파일이 없습니다.');
    process.exit(1);
  }

  let total = 0;
  for (const name of files) {
    const full = join(assetsDir, name);
    if (!statSync(full).isFile()) continue;
    const size = await gzipSize(readFileSync(full));
    total += size;
    console.log(`  ${name}: ${(size / 1024).toFixed(1)} KiB gzip`);
  }

  const limit = LIMIT_BYTES;
  console.log(
    `check-bundle-size: total ${(total / 1024).toFixed(1)} KiB gzip / limit ${(limit / 1024).toFixed(1)} KiB`
  );
  console.log(`check-bundle-size: suggested LIMIT_BYTES=${Math.ceil(total * 1.1)}`);

  if (total > limit) {
    console.error(
      `check-bundle-size: JS gzip 합계가 한도를 초과했습니다 (${total} > ${limit} bytes)`
    );
    process.exit(1);
  }
  console.log('check-bundle-size: ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
