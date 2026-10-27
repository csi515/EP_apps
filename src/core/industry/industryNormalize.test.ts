/**
 * industry_type 정규화 — EP_apps personal_plant_ops 단일 카탈로그.
 * 실행: npm run test:industry-normalize
 */
import assert from 'node:assert/strict';
import {
  DEFAULT_CREATE_INDUSTRY_TYPE,
  getIndustryLabel,
  hasIndustryModule,
  isBlankIndustryInput,
  normalizeIndustryType,
  parseIndustryType,
  shouldUseGenericShell,
} from './types';
import { resolveIndustryAppKind } from './industryAppResolve';
import { INDUSTRY_DEFINITIONS } from './catalog';
import { buildGenericPluginManifest } from './genericPlugin';
import { installIndustryPlugin } from './pluginHost';
import { resolveHydrateModules } from '../../services/adapters/hydrateModules';

function run() {
  installIndustryPlugin(buildGenericPluginManifest(INDUSTRY_DEFINITIONS.personal_plant_ops));

  assert.equal(DEFAULT_CREATE_INDUSTRY_TYPE, 'personal_plant_ops');

  assert.equal(parseIndustryType('personal_plant_ops'), 'personal_plant_ops');
  assert.equal(normalizeIndustryType('personal_plant_ops'), 'personal_plant_ops');
  assert.equal(normalizeIndustryType('ep_apps'), 'personal_plant_ops');
  assert.equal(resolveIndustryAppKind('personal_plant_ops'), 'generic');
  assert.equal(hasIndustryModule('personal_plant_ops'), false);
  assert.equal(shouldUseGenericShell('personal_plant_ops'), true);

  assert.equal(isBlankIndustryInput(null), true);
  assert.equal(isBlankIndustryInput(''), true);
  assert.equal(parseIndustryType(null), null);
  assert.equal(normalizeIndustryType(null), null);
  assert.equal(normalizeIndustryType(''), null);
  assert.equal(resolveIndustryAppKind(null), 'generic');

  // 모아 업종·알 수 없는 값은 카탈로그에 없음
  assert.equal(parseIndustryType('piano'), null);
  assert.equal(normalizeIndustryType('piano'), null);
  assert.equal(hasIndustryModule('piano'), false);
  assert.equal(getIndustryLabel('personal_plant_ops'), 'EP_apps');
  assert.equal(getIndustryLabel('unknown_xyz'), 'EP_apps');

  assert.deepEqual(resolveHydrateModules('personal_plant_ops'), {
    piano: false,
    education: false,
    daycare: false,
  });
  assert.equal(resolveHydrateModules(null).piano, false);

  console.log('industryNormalize.test.ts: ok');
}

run();
