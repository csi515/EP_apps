/**
 * 40대 전방위 업종 프리셋 조립 엔진 무결성 단위 테스트
 * 실행: npx tsx src/app/presets/presetAssembler.test.ts
 */

import assert from 'node:assert/strict';
import {
  INDUSTRY_PRESETS,
  listIndustryPresets,
} from './presetRegistry';
import {
  assemblePreset,
  assembleAdHocCapabilities,
} from './presetAssembler';
import type { PresetCapabilityId } from '@/core/presets/types';
import { PRESET_DEFINITIONS } from '@/core/presets/definitions';
import { getStandardPresetsForIndustry } from './presetQuestionEngine';
import { getResolvedTerm } from '@/core/i18n/termEngine';

function run() {
  const presets = listIndustryPresets();
  assert.ok(presets.length >= 40, `최소 40개 업종 프리셋이 등록되어야 합니다. 현재: ${presets.length}`);

  // 40개 대표 업종 ID 목록 검증
  const REQUIRED_40_PRESET_IDS = [
    // Group 1: 학원·교육 (8종)
    'piano',
    'general_academy',
    'language_academy',
    'art_academy',
    'taekwondo_academy',
    'dance_academy',
    'coding_academy',
    'exam_tutoring',
    // Group 2: 체육·피트니스 (8종)
    'pilates',
    'yoga_studio',
    'gym_fitness',
    'pt_fitness',
    'indoor_golf',
    'swim_school',
    'climbing_activity',
    'boxing_mma',
    // Group 3: 뷰티·웰빙 (8종)
    'hair_salon',
    'barber_shop',
    'nail_salon',
    'skin_clinic',
    'massage_spa',
    'tattoo_studio',
    'photo_studio',
    'pet_grooming',
    // Group 4: 공간·대여·숙박 (6종)
    'study_cafe',
    'shared_office',
    'space_rental',
    'locker_storage',
    'guesthouse',
    'small_hotel',
    // Group 5: 도소매·외식 (6종)
    'retail',
    'apparel_store',
    'convenience_store',
    'pet_supplies',
    'cafe',
    'restaurant',
    // Group 6: 생활서비스·정비·특수 (4종)
    'auto_repair',
    'cleaning_service',
    'pet_hotel',
    'equipment_rental',
  ];

  for (const requiredId of REQUIRED_40_PRESET_IDS) {
    assert.ok(
      INDUSTRY_PRESETS[requiredId],
      `필수 40대 업종 프리셋 [${requiredId}]가 누락되었습니다.`
    );
  }

  // 모든 등록된 프리셋에 대해 조립 무결성 전수 검증
  for (const preset of presets) {
    const assembled = assemblePreset(preset.id);

    // 1. 프리셋 메타데이터 및 Capability 목록 검증
    assert.equal(assembled.preset.id, preset.id);
    assert.ok(assembled.capabilities.length > 0, `${preset.id}: Capability 목록이 비어있음`);
    assert.deepEqual(assembled.capabilities, preset.capabilities);

    // 2. setupSchema 누락 없는 결합 검증
    assert.equal(
      assembled.setupSchemas.length,
      preset.capabilities.length,
      `${preset.id}: 구성된 capability 개수만큼 setupSchema가 병합되어야 함`
    );
    for (const capId of preset.capabilities) {
      const foundSchema = assembled.setupSchemas.find((s) => s.capabilityId === capId);
      assert.ok(foundSchema, `${preset.id}: capability [${capId}]의 setupSchema 누락`);
      assert.ok(foundSchema.fields.length > 0, `${preset.id}: [${capId}] 필드가 비어있음`);
    }

    // 3. resources 누락 없는 결합 검증
    assert.ok(
      assembled.resources.length >= preset.capabilities.length,
      `${preset.id}: 구성된 capability 수 이상의 리소스가 병합되어야 함`
    );

    // 4. allFields 고유 필드 집합 검증
    assert.ok(assembled.allFields.length > 0);
    const seenIds = new Set<string>();
    for (const f of assembled.allFields) {
      assert.equal(seenIds.has(f.id), false, `중복 필드 키 발견: ${f.id}`);
      seenIds.add(f.id);
    }

    // 5. 완성도 수준(readinessLevel) 유효성 검증
    if (preset.readinessLevel) {
      assert.ok(
        ['configured', 'basic_ui', 'workflow', 'persisted', 'isolated', 'verified'].includes(
          preset.readinessLevel
        ),
        `${preset.id}: 유효하지 않은 readinessLevel ${preset.readinessLevel}`
      );
    }

    // 5-1. 업종별 특성 SSOT 계약 검증 (Terms, OperatingHours)
    assert.ok(preset.terms, `${preset.id}: terms 메타데이터 필수`);
    assert.ok(preset.terms.customer, `${preset.id}: terms.customer 고객 호칭 필수`);
    assert.ok(preset.operatingHours, `${preset.id}: operatingHours 필수`);
    assert.ok(preset.operatingHours.day_type, `${preset.id}: operatingHours.day_type 필수`);
    assert.ok(preset.operatingHours.start_time, `${preset.id}: operatingHours.start_time 필수`);
    assert.ok(preset.operatingHours.end_time, `${preset.id}: operatingHours.end_time 필수`);
    assert.ok(preset.operatingHours.slot_minutes > 0, `${preset.id}: operatingHours.slot_minutes 양수 필수`);

    // 5-2. 업종별 테마 및 스타터 템플릿 계약 검증 (Theme, StarterPassTemplates)
    assert.ok(preset.theme, `${preset.id}: theme 메타데이터 필수`);
    assert.ok(preset.theme.accentColor, `${preset.id}: theme.accentColor 필수`);
    assert.ok(preset.theme.badgeEmoji, `${preset.id}: theme.badgeEmoji 필수`);
    assert.ok(Array.isArray(preset.starterPassTemplates) && preset.starterPassTemplates.length > 0, `${preset.id}: starterPassTemplates 1개 이상 필수`);
    for (const tpl of preset.starterPassTemplates) {
      assert.ok(tpl.name, `${preset.id}: 템플릿 이름 필수`);
      assert.ok(tpl.passType, `${preset.id}: 템플릿 타입 필수`);
      assert.ok(tpl.totalCount > 0, `${preset.id}: 템플릿 횟수/일수 양수 필수`);
      assert.ok(tpl.validityDays > 0, `${preset.id}: 템플릿 유효기간 양수 필수`);
    }
  }

  // 6. ad-hoc 임의 조합 테스트
  const adHoc = assembleAdHocCapabilities(['seat_room', 'credit_wallet']);
  assert.equal(adHoc.setupSchemas.length, 2);
  assert.equal(adHoc.resources.length, 2);
  assert.ok(adHoc.resources.some((r) => r.name === 'seat_rooms'));
  assert.ok(adHoc.resources.some((r) => r.name === 'credit_wallets'));

  // 7. 존재하지 않는 프리셋 에러 방어
  assert.throws(() => {
    assemblePreset('unknown_preset_123');
  }, /미등록된 업종 프리셋 ID/);

  // 8. Core Capability Alias 자동 해석 조립 검증 (CAP-001)
  const aliasAssembly = assembleAdHocCapabilities([
    'billing',
    'consultation',
    'commerce',
    'scheduling',
    'resources',
  ]);
  assert.equal(aliasAssembly.setupSchemas.length, 5);
  const schemaCapIds = aliasAssembly.setupSchemas.map((s) => s.capabilityId);
  assert.ok(schemaCapIds.includes('billing_invoicing'), 'billing -> billing_invoicing 번들 조립 실패');
  assert.ok(schemaCapIds.includes('consultation_crm'), 'consultation -> consultation_crm 번들 조립 실패');
  assert.ok(schemaCapIds.includes('inventory'), 'commerce -> inventory 번들 조립 실패');
  assert.ok(schemaCapIds.includes('booking'), 'scheduling -> booking 번들 조립 실패');
  assert.ok(schemaCapIds.includes('seat_room'), 'resources -> seat_room 번들 조립 실패');
  assert.ok(aliasAssembly.resources.length >= 5, '리소스 병합 실패');

  // 9. 확장 프리셋 정의 무결성 검증 (definitions.ts)
  assert.ok(PRESET_DEFINITIONS.length >= 31, `업종 프리셋 정의가 최소 31개 이상이어야 합니다. 현재: ${PRESET_DEFINITIONS.length}`);
  const VALID_CATEGORIES = new Set(['SPORTS', 'BEAUTY', 'SPACE', 'CRAFT', 'FIELD', 'CORP', 'RETAIL', 'COMMUNITY']);
  for (const p of PRESET_DEFINITIONS) {
    assert.ok(p.id, '프리셋 ID 필수');
    assert.ok(p.name, '프리셋 이름 필수');
    assert.ok(VALID_CATEGORIES.has(p.category), `유효하지 않은 카테고리: ${p.category}`);
    assert.ok(p.recommendedCapabilities.length > 0, `추천 기능 1개 이상 필수: ${p.id}`);
    assert.ok(p.defaultTerms.customer, `기본 고객 호칭 필수: ${p.id}`);

    // 추천 Capability가 모두 실제로 조립 가능한지 검증
    const assembled = assembleAdHocCapabilities(p.recommendedCapabilities);
    assert.ok(assembled.setupSchemas.length > 0, `${p.id}의 추천 기능 조립 실패`);
  }
  console.log(`✓ 업종 프리셋 레시피 무결성 검증 완료 (${PRESET_DEFINITIONS.length}개 프리셋 전수 검증)`);

  // 10. orchid_nursery (난초·희귀식물 배양 및 분양원) 프리셋 계약 검증
  const orchid = PRESET_DEFINITIONS.find((p) => p.id === 'orchid_nursery');
  assert.ok(orchid, 'orchid_nursery 프리셋이 definitions.ts에 등록되어야 합니다.');
  assert.equal(orchid.name, '난초·희귀식물 배양 및 분양원');
  assert.equal(orchid.category, 'RETAIL');
  assert.deepEqual(orchid.recommendedCapabilities, [
    'retail_inventory',
    'treatment_chart',
    'task_pipeline',
    'seat_room',
    'crm_tags',
    'billing_invoices',
  ]);
  assert.deepEqual(orchid.defaultTerms, {
    customer: '애란인/고객',
    space: '온실/배양대',
    instructor: '재배관리사',
    pass: '분양/보증서',
  });
  const orchidAssembled = assembleAdHocCapabilities(orchid.recommendedCapabilities);
  assert.equal(orchidAssembled.setupSchemas.length, 6, 'orchid_nursery 6대 추천 Capability 번들 조립 성공');
  console.log('✓ orchid_nursery 프리셋 정의 및 조립 계약 검증 완료');

  // 10-1. baby_food_coop (이유식 품앗이) COMMUNITY 프리셋 계약 검증
  const babyFoodPreset = PRESET_DEFINITIONS.find((p) => p.id === 'baby_food_coop');
  assert.ok(babyFoodPreset, 'baby_food_coop 프리셋이 definitions.ts에 등록되어야 합니다.');
  assert.equal(babyFoodPreset.name, '이유식 품앗이 / 공동육아');
  assert.equal(babyFoodPreset.category, 'COMMUNITY');
  assert.equal(babyFoodPreset.defaultTerms.customer, '참여 가족 (아기)');
  assert.ok(babyFoodPreset.recommendedCapabilities.includes('baby_food_coop'));
  assert.ok(babyFoodPreset.recommendedCapabilities.includes('booking'));
  assert.ok(babyFoodPreset.recommendedCapabilities.includes('rental_equipment'));
  console.log('✓ baby_food_coop (COMMUNITY) 프리셋 정의 및 조립 계약 검증 완료');

  // 11. Zero-Condition 온보딩 추천값 검증 (getStandardPresetsForIndustry)
  const golf = getStandardPresetsForIndustry('indoor_golf');
  assert.equal(golf.roles[0].name, '점장');
  assert.equal(golf.locker_count, 50);
  assert.equal(golf.operating_hours.slot_minutes, 60);

  const hair = getStandardPresetsForIndustry('hair_salon');
  assert.equal(hair.roles[0].name, '원장');
  assert.equal(hair.roles[1].name, '디자이너');
  assert.equal(hair.locker_count, undefined);

  const study = getStandardPresetsForIndustry('study_cafe');
  assert.equal(study.roles[0].name, '관리자');
  assert.equal(study.locker_count, 30);
  assert.equal(study.operating_hours.start_time, '00:00');

  const taekwondo = getStandardPresetsForIndustry('taekwondo_academy');
  assert.equal(taekwondo.roles[0].name, '관장');
  assert.equal(taekwondo.roles[1].name, '사범');
  assert.equal(taekwondo.locker_count, undefined);
  assert.equal(taekwondo.operating_hours.slot_minutes, 50);
  console.log('✓ Zero-Condition 온보딩 추천값 무결성 검증 완료');

  // 12. 53대 프리셋 런타임 용어 치환 전수 무결성 검증 (termEngine)
  assert.equal(getResolvedTerm('customer', undefined, 'taekwondo_academy'), '수련생/관원');
  assert.equal(getResolvedTerm('instructor', undefined, 'indoor_golf'), '레슨프로');
  assert.equal(getResolvedTerm('space', undefined, 'hair_salon'), '시술체어');
  assert.equal(getResolvedTerm('pass', undefined, 'study_cafe'), '시간권/기간권');
  assert.equal(getResolvedTerm('customer', undefined, 'orchid_nursery'), '애란인/고객');
  assert.equal(getResolvedTerm('customer', undefined, 'baby_food_coop'), '참여 가족 (아기)');
  assert.equal(getResolvedTerm('tenant', undefined, 'baby_food_coop'), '우리 품앗이 모임');
  assert.equal(getResolvedTerm('billing', undefined, 'baby_food_coop'), '재료비 1/N 정산');
  console.log('✓ 런타임 도메인 용어 엔진 전수 치환 검증 완료');

  console.log(`presetAssembler.test.ts: ok (${presets.length} industry presets verified successfully)`);
}

run();
