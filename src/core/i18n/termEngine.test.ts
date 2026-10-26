import assert from 'node:assert/strict';
import {
  getResolvedTerm,
  replaceTenantTerms,
  normalizeTermKey,
  DEFAULT_TERMS,
} from './termEngine';

function run() {
  // 0. normalizeTermKey 정규화 검증
  assert.equal(normalizeTermKey('customer'), 'term.customer');
  assert.equal(normalizeTermKey('term.customer'), 'term.customer');
  assert.equal(normalizeTermKey('space'), 'term.space');
  assert.equal(normalizeTermKey('pass'), 'term.pass');
  assert.equal(normalizeTermKey('instructor'), 'term.instructor');
  assert.equal(normalizeTermKey('lesson'), 'term.lesson');
  assert.equal(normalizeTermKey('tenant'), 'term.tenant');
  assert.equal(normalizeTermKey('owner'), 'term.owner');
  assert.equal(normalizeTermKey('staff'), 'term.staff');
  assert.equal(normalizeTermKey('billing'), 'term.billing');

  // 1. 미설정 시 기본값 반환 검증 (전체 키 & 축약 키 지원)
  assert.equal(getResolvedTerm('term.customer'), '고객');
  assert.equal(getResolvedTerm('customer'), '고객');
  assert.equal(getResolvedTerm('term.space'), '공간');
  assert.equal(getResolvedTerm('space'), '공간');
  assert.equal(getResolvedTerm('term.pass'), '이용권');
  assert.equal(getResolvedTerm('pass'), '이용권');
  assert.equal(getResolvedTerm('term.instructor'), '강사');
  assert.equal(getResolvedTerm('instructor'), '강사');
  assert.equal(getResolvedTerm('term.lesson'), '수업');
  assert.equal(getResolvedTerm('lesson'), '수업');
  assert.equal(getResolvedTerm('tenant'), '사업장');
  assert.equal(getResolvedTerm('owner'), '대표');
  assert.equal(getResolvedTerm('staff'), '직원');
  assert.equal(getResolvedTerm('billing'), '청구');

  // 2. 프리셋별 기본값 반환 검증
  // 2-1. 피아노 학원 프리셋
  assert.equal(getResolvedTerm('term.customer', undefined, 'piano'), '원생');
  assert.equal(getResolvedTerm('customer', undefined, 'piano'), '원생');
  assert.equal(getResolvedTerm('term.space', undefined, 'piano'), '연습실');
  assert.equal(getResolvedTerm('space', undefined, 'piano'), '연습실');
  assert.equal(getResolvedTerm('term.pass', undefined, 'piano'), '수강권');
  assert.equal(getResolvedTerm('pass', undefined, 'piano'), '수강권');
  assert.equal(getResolvedTerm('term.instructor', undefined, 'piano'), '선생님');
  assert.equal(getResolvedTerm('instructor', undefined, 'piano'), '선생님');
  assert.equal(getResolvedTerm('term.lesson', undefined, 'piano'), '레슨');
  assert.equal(getResolvedTerm('lesson', undefined, 'piano'), '레슨');

  // 2-2. 골프 프리셋
  assert.equal(getResolvedTerm('space', undefined, 'indoor_golf'), '타석');
  assert.equal(getResolvedTerm('instructor', undefined, 'indoor_golf'), '레슨프로');

  // 2-3. 미용실 프리셋
  assert.equal(getResolvedTerm('space', undefined, 'hair_salon'), '시술체어');
  assert.equal(getResolvedTerm('instructor', undefined, 'hair_salon'), '디자이너');

  // 2-4. 이유식 품앗이 COMMUNITY 프리셋
  assert.equal(getResolvedTerm('customer', undefined, 'baby_food_coop'), '참여 가족 (아기)');
  assert.equal(getResolvedTerm('tenant', undefined, 'baby_food_coop'), '우리 품앗이 모임');
  assert.equal(getResolvedTerm('billing', undefined, 'baby_food_coop'), '재료비 1/N 정산');
  assert.equal(getResolvedTerm('staff', undefined, 'baby_food_coop'), '공동 당번 (요리 조)');

  // 3. 사업주 커스텀 설정이 프리셋보다 최우선 적용되는지 검증
  const customTerms = {
    'term.customer': '꿈나무 원생',
    'term.space': '개인 스튜디오',
  };
  assert.equal(getResolvedTerm('term.customer', customTerms, 'piano'), '꿈나무 원생');
  assert.equal(getResolvedTerm('customer', customTerms, 'piano'), '꿈나무 원생');
  assert.equal(getResolvedTerm('space', customTerms, 'piano'), '개인 스튜디오');
  assert.equal(getResolvedTerm('pass', customTerms, 'piano'), '수강권');

  // 4. 텍스트 내 {term.xxx} 및 {xxx} 토큰 실시간 일괄 치환 검증
  const template1 = '{term.customer}님이 {term.space}에서 {term.pass}으로 {term.lesson}을(를) 예약했습니다.';
  const template2 = '{customer}님이 {space}에서 {pass}으로 {lesson}을(를) 예약했습니다.';

  // 4-1. 시스템 기본 치환
  assert.equal(replaceTenantTerms(template1), '고객님이 공간에서 이용권으로 수업을(를) 예약했습니다.');
  assert.equal(replaceTenantTerms(template2), '고객님이 공간에서 이용권으로 수업을(를) 예약했습니다.');

  // 4-2. 피아노 학원 치환
  assert.equal(replaceTenantTerms(template1, undefined, 'piano'), '원생님이 연습실에서 수강권으로 레슨을(를) 예약했습니다.');
  assert.equal(replaceTenantTerms(template2, undefined, 'piano'), '원생님이 연습실에서 수강권으로 레슨을(를) 예약했습니다.');

  // 4-3. 사업주 커스텀 치환
  const customReplaced = replaceTenantTerms(template2, {
    'term.customer': 'VIP 회원',
    'term.space': '1호 룸',
    'term.pass': '골드 멤버십',
    'term.lesson': '1:1 세션',
  });
  assert.equal(customReplaced, 'VIP 회원님이 1호 룸에서 골드 멤버십으로 1:1 세션을(를) 예약했습니다.');

  console.log('termEngine.test.ts: ok (with preset resolution & template replacement)');
}

run();
