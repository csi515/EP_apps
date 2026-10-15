import assert from 'node:assert/strict';
import {
  getResolvedTerm,
  replaceTenantTerms,
  DEFAULT_TERMS,
} from './termEngine';

function run() {
  // 1. 미설정 시 기본값 반환 검증
  assert.equal(getResolvedTerm('term.customer'), '고객');
  assert.equal(getResolvedTerm('term.space'), '공간');
  assert.equal(getResolvedTerm('term.pass'), '이용권');
  assert.equal(getResolvedTerm('term.instructor'), '강사');
  assert.equal(getResolvedTerm('term.lesson'), '수업');

  // 2. 프리셋별 기본값 반환 검증
  // 2-1. 피아노 학원 프리셋
  assert.equal(getResolvedTerm('term.customer', undefined, 'piano'), '원생');
  assert.equal(getResolvedTerm('term.space', undefined, 'piano'), '연습실');
  assert.equal(getResolvedTerm('term.pass', undefined, 'piano'), '수강권');
  assert.equal(getResolvedTerm('term.lesson', undefined, 'piano'), '레슨');

  // 2-2. 골프 프리셋
  assert.equal(getResolvedTerm('term.space', undefined, 'indoor_golf'), '타석');
  assert.equal(getResolvedTerm('term.instructor', undefined, 'indoor_golf'), '레슨프로');

  // 2-3. 미용실 프리셋
  assert.equal(getResolvedTerm('term.space', undefined, 'hair_salon'), '시술체어');
  assert.equal(getResolvedTerm('term.instructor', undefined, 'hair_salon'), '디자이너');

  // 3. 사업주 커스텀 설정이 프리셋보다 최우선 적용되는지 검증
  const customTerms = {
    'term.customer': '꿈나무 원생',
    'term.space': '개인 스튜디오',
  };
  assert.equal(getResolvedTerm('term.customer', customTerms, 'piano'), '꿈나무 원생');
  assert.equal(getResolvedTerm('term.space', customTerms, 'piano'), '개인 스튜디오');
  // 설정하지 않은 항목은 프리셋 값 유지
  assert.equal(getResolvedTerm('term.pass', customTerms, 'piano'), '수강권');

  // 4. 텍스트 내 {term.xxx} 토큰 실시간 일괄 치환 검증
  const template = '{term.customer}님이 {term.space}에서 {term.pass}으로 {term.lesson}을(를) 예약했습니다.';

  // 4-1. 시스템 기본 치환
  const defaultReplaced = replaceTenantTerms(template);
  assert.equal(defaultReplaced, '고객님이 공간에서 이용권으로 수업을(를) 예약했습니다.');

  // 4-2. 피아노 학원 치환
  const pianoReplaced = replaceTenantTerms(template, undefined, 'piano');
  assert.equal(pianoReplaced, '원생님이 연습실에서 수강권으로 레슨을(를) 예약했습니다.');

  // 4-3. 사업주 커스텀 치환
  const customReplaced = replaceTenantTerms(template, {
    'term.customer': 'VIP 회원',
    'term.space': '1호 룸',
    'term.pass': '골드 멤버십',
    'term.lesson': '1:1 세션',
  });
  assert.equal(customReplaced, 'VIP 회원님이 1호 룸에서 골드 멤버십으로 1:1 세션을(를) 예약했습니다.');

  console.log('termEngine.test.ts: ok (with preset resolution & template replacement)');
}

run();
