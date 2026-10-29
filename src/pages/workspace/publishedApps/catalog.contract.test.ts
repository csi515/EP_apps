/**
 * 게시 앱 카탈로그 자체 계약: 런처 타일 수와 1:1
 * 실행: npx tsx src/pages/workspace/publishedApps/catalog.contract.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLISHED_COMPANY_APPS } from '../publishedCompanyApps';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const launcher = readFileSync(
  join(root, 'src/pages/workspace/CompanyAppLauncherDashboard.tsx'),
  'utf8'
);

assert.equal(PUBLISHED_COMPANY_APPS.length, 9, 'published app count');

for (const app of PUBLISHED_COMPANY_APPS) {
  assert.match(launcher, new RegExp(`id:\\s*'${app.id}'`), `launcher has ${app.id}`);
}

assert.doesNotMatch(launcher, /id:\s*'facility[_-]incident'|id:\s*'facility'/);
assert.match(launcher, /errorNotification:\s*false/, 'home approvals must suppress Failed to fetch toast');

console.log('publishedApps/catalog.contract.test.ts: ok');
