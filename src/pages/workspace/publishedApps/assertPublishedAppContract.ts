/**
 * 게시 앱 계약 공통 검사.
 * 각 publishedApps/*.contract.test.ts 에서 앱 1종씩 호출한다.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INDUSTRY_PRESETS } from '@/app/presets/presetRegistry';
import { resolveEnabledCaps, tileAllowed } from '../CompanyAppLauncherDashboard';
import {
  USER_FACING_ERROR_MESSAGES,
  sanitizeErrorToastMessage,
  userFacingErrorMessage,
} from '@/shared/errors/userFacingError';
import type { PublishedCompanyApp } from '../publishedCompanyApps';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

function read(rel: string): string {
  const path = join(root, rel);
  assert.ok(existsSync(path), `missing file: ${rel}`);
  return readFileSync(path, 'utf8');
}

export function assertPublishedAppContract(app: PublishedCompanyApp): void {
  const plant = INDUSTRY_PRESETS.personal_plant_ops;
  assert.ok(plant, 'personal_plant_ops preset required');

  const enabled = resolveEnabledCaps('personal_plant_ops', [], [], []);
  for (const cap of app.capabilities) {
    assert.ok(
      enabled.includes(cap) || app.capabilities.some((c) => enabled.includes(c)),
      `${app.id}: capability ${cap} should be enabled (or sibling cap)`
    );
  }
  assert.equal(
    tileAllowed({ requiredAnyCapability: app.capabilities } as never, enabled),
    true,
    `${app.id}: launcher tile must be allowed for default plant caps`
  );

  const launcher = read('src/pages/workspace/CompanyAppLauncherDashboard.tsx');
  assert.match(
    launcher,
    new RegExp(`id:\\s*'${app.id}'`),
    `${app.id}: must appear in CompanyAppLauncherDashboard`
  );
  assert.match(
    launcher,
    new RegExp(`to:\\s*'${app.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`),
    `${app.id}: launcher path must be ${app.path}`
  );

  const appTsx = read('src/App.tsx');
  assert.match(
    appTsx,
    new RegExp(`path="${app.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`),
    `${app.id}: App.tsx must declare route ${app.path}`
  );

  assert.ok(existsSync(join(root, app.pageRel)), `${app.id}: missing page ${app.pageRel}`);
  for (const rel of app.errorSurfaceRels) {
    assert.ok(existsSync(join(root, rel)), `${app.id}: missing error surface ${rel}`);
  }

  // 앱 표면에서 네트워크 실패가 영문 그대로 뜨지 않도록 공통 계층이 살균한다.
  assert.equal(
    sanitizeErrorToastMessage('Failed to fetch'),
    USER_FACING_ERROR_MESSAGES.network,
    `${app.id}: Failed to fetch must be sanitized`
  );
  assert.equal(
    sanitizeErrorToastMessage('TypeError: Failed to fetch'),
    USER_FACING_ERROR_MESSAGES.network,
    `${app.id}: TypeError: Failed to fetch must be sanitized`
  );
  assert.equal(
    userFacingErrorMessage(new TypeError('Failed to fetch')),
    USER_FACING_ERROR_MESSAGES.network,
    `${app.id}: TypeError object must map to network copy`
  );
  assert.doesNotMatch(
    sanitizeErrorToastMessage('조회에 실패했습니다.'),
    /Failed to fetch|TypeError/i,
    `${app.id}: Korean fallback must stay Korean`
  );

  const notification = read('src/providers/notificationProvider.ts');
  assert.match(
    notification,
    /sanitizeErrorToastMessage/,
    `${app.id}: Refine notifications must sanitize Failed to fetch`
  );
  const feedback = read('src/shared/feedback/uiFeedback.ts');
  assert.match(
    feedback,
    /sanitizeErrorToastMessage/,
    `${app.id}: showToast(error) must sanitize Failed to fetch`
  );
}
