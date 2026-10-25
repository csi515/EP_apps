import assert from 'node:assert/strict';
import { getResolvedTerm } from '@/core/i18n/termEngine';
import { getIndustryPreset } from '@/app/presets/presetRegistry';

function run() {
  // 1. 프리셋 등록 여부 검증
  const golfPreset = getIndustryPreset('indoor_golf');
  assert.ok(golfPreset, '골프 프리셋 존재');
  assert.equal(golfPreset.terms?.customer, '회원');
  assert.equal(golfPreset.terms?.instructor, '레슨프로');
  assert.equal(golfPreset.terms?.space, '타석/룸');

  // 2. 커스텀 오버라이드 없을 때 프리셋 기본 용어 반영
  const defaultCustomer = getResolvedTerm('term.customer', {}, 'indoor_golf');
  assert.equal(defaultCustomer, '회원');

  // 3. 커스텀 오버라이드 주입 시 사용자 맞춤 용어 우선 반영
  const customCustomer = getResolvedTerm(
    'term.customer',
    { 'term.customer': '골퍼' },
    'indoor_golf'
  );
  assert.equal(customCustomer, '골퍼', '커스텀 용어 우선 오버라이드');

  // 4. 피아노 학원 기본 용어 검증
  const pianoCustomer = getResolvedTerm('term.customer', {}, 'piano');
  assert.equal(pianoCustomer, '원생');
  const pianoSpace = getResolvedTerm('term.space', {}, 'piano');
  assert.equal(pianoSpace, '연습실');

  console.log('tenantTermsEngine.test.ts: ok');
}

run();
