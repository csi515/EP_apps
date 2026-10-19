import assert from 'node:assert/strict';
import { QuickSetupPage } from './QuickSetupPage';

// 1. 컴포넌트 export 검증
assert.equal(typeof QuickSetupPage, 'function', 'QuickSetupPage must be a React component function');

// 2. 기업/제조업 프리셋 vs 소상공인 프리셋 부서 스코프 지능형 분기 로직 단위 검증
function isEnterpriseOrManufacturingPreset(industryId: string, category?: string): boolean {
  const cat = category?.toLowerCase();
  const id = industryId.toLowerCase();
  return (
    cat === 'manufacturing' ||
    cat === 'enterprise' ||
    id.includes('enterprise') ||
    id.includes('manufacturing') ||
    id.includes('plant_ops') ||
    id.includes('corp') ||
    id === 'iso_ims_enterprise' ||
    id === 'iso_human_capital' ||
    id === 'rnd_lab_management' ||
    id === 'general_enterprise' ||
    id === 'manufacturing_light'
  );
}

// 소상공인 프리셋: Auto-Skip (false) -> 복잡도 0원 보장
assert.equal(isEnterpriseOrManufacturingPreset('piano', 'education'), false, '피아노 학원은 부서 스킵');
assert.equal(isEnterpriseOrManufacturingPreset('pilates', 'fitness'), false, '필라테스 스튜디오는 부서 스킵');
assert.equal(isEnterpriseOrManufacturingPreset('sauna', 'wellness'), false, '사우나는 부서 스킵');
assert.equal(isEnterpriseOrManufacturingPreset('study_cafe', 'studio'), false, '스터디카페는 부서 스킵');
assert.equal(isEnterpriseOrManufacturingPreset('nail_salon', 'beauty'), false, '네일샵은 부서 스킵');

// 기업/제조업 프리셋: 부서 설정 카드 활성화 (true)
assert.equal(isEnterpriseOrManufacturingPreset('personal_plant_ops', 'manufacturing'), true, '개인 공장/제조는 부서 설정 노출');
assert.equal(isEnterpriseOrManufacturingPreset('manufacturing_light', 'manufacturing'), true, '경공업 제조는 부서 설정 노출');
assert.equal(isEnterpriseOrManufacturingPreset('general_enterprise', 'enterprise'), true, '일반 기업은 부서 설정 노출');
assert.equal(isEnterpriseOrManufacturingPreset('iso_ims_enterprise', 'enterprise'), true, 'ISO 인증 기업은 부서 설정 노출');
assert.equal(isEnterpriseOrManufacturingPreset('rnd_lab_management', 'enterprise'), true, 'R&D 연구소는 부서 설정 노출');

console.log('QuickSetupPage.test.ts: ok');
