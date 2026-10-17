import { describe, it } from 'node:test';
import assert from 'node:assert';
import { recommendIndustryPreset } from './presetRecommendationEngine';

describe('presetRecommendationEngine 단위 테스트', () => {
  it('1. 빈 문자열이나 공백 입력 시 null 추천 반환', () => {
    const res = recommendIndustryPreset('   ');
    assert.strictEqual(res.topRecommendation, null);
    assert.strictEqual(res.alternativeRecommendations.length, 0);
  });

  it('2. 음악/피아노 학원 + 주차권 쿼리 분석', () => {
    const query = '판교에서 1:1 레슨 피아노 음악학원을 운영하고 있으며, 학부모 차량 무료 주차권 정산이 필요합니다.';
    const res = recommendIndustryPreset(query);

    assert.ok(res.topRecommendation);
    assert.strictEqual(res.topRecommendation.presetId, 'piano');
    assert.strictEqual(res.topRecommendation.confidence, 'high');
    assert.ok(res.topRecommendation.score >= 70);

    // 부가 기능으로 주차 관리 추천 확인
    assert.ok(res.detectedAddonCapabilities.includes('parking_validator'));
    const parkingAddon = res.topRecommendation.recommendedAddons.find(
      (a) => a.capabilityId === 'parking_validator'
    );
    assert.ok(parkingAddon, '주차 등록이 추가 추천에 포함되어야 함');
  });

  it('3. 필라테스 스튜디오 + 셔틀버스 쿼리 분석', () => {
    const query = '기구 필라테스 리포머 1:1 및 소그룹 레슨 스튜디오입니다. 회원 안심 셔틀버스를 운행해요.';
    const res = recommendIndustryPreset(query);

    assert.ok(res.topRecommendation);
    assert.strictEqual(res.topRecommendation.presetId, 'pilates');
    assert.ok(res.detectedAddonCapabilities.includes('vehicle_shuttle'));
  });

  it('4. 정밀 가공 제조공장 + 부품표(BOM) + ECN 쿼리 분석', () => {
    const query = '자동차 부품 정밀 가공 공장으로 부품표(BOM) 관리와 생산 공정, 4M 설계변경 관리가 필요합니다.';
    const res = recommendIndustryPreset(query);

    assert.ok(res.topRecommendation);
    assert.strictEqual(res.topRecommendation.presetId, 'manufacturing_light');
    assert.ok(res.topRecommendation.score >= 80);
  });

  it('5. 기업부설연구소 + 특허 + 유연근무 휴가 쿼리 분석', () => {
    const query = '바이오 R&D 기업부설연구소인데 직무발명 특허 보상과 연구원 시간 단위 연차 휴가 관리를 도입하고 싶어요.';
    const res = recommendIndustryPreset(query);

    assert.ok(res.topRecommendation);
    assert.strictEqual(res.topRecommendation.presetId, 'rnd_lab_management');
    assert.ok(res.detectedAddonCapabilities.includes('leave_management'));
  });

  it('6. 스터디카페 + 좌석 시간권 쿼리 분석', () => {
    const query = '24시간 무인 스터디카페 독서실 좌석 배정과 키오스크 시간권 관리를 원합니다.';
    const res = recommendIndustryPreset(query);

    assert.ok(res.topRecommendation);
    assert.strictEqual(res.topRecommendation.presetId, 'study_cafe');
  });
});
