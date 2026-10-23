import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeScannedKoreanText } from './useBarcodeScanner';

test('normalizeScannedKoreanText: 순수 영숫자는 그대로 유지', () => {
  assert.equal(normalizeScannedKoreanText('8801043014856'), '8801043014856');
  assert.equal(normalizeScannedKoreanText('SKU-RED-XL-001'), 'SKU-RED-XL-001');
  assert.equal(normalizeScannedKoreanText('v:550e8400-e29b'), 'v:550e8400-e29b');
});

test('normalizeScannedKoreanText: 한글 상태 입력 복원 (두벌식 -> QWERTY)', () => {
  // 'abc' -> 한글 상태에서 'ㅁㅠㅊ'
  assert.equal(normalizeScannedKoreanText('ㅁㅠㅊ'), 'abc');
  // 'moa' -> 한글 상태에서 'ㅡㅐㅁ'
  assert.equal(normalizeScannedKoreanText('ㅡㅐㅁ'), 'moa');
  // 완성형 한글 '안녕' -> 'dkssud'
  assert.equal(normalizeScannedKoreanText('안녕'), 'dkssud');
});
