/**
 * Dynamic Schema Form Builder Unit Tests.
 */

import assert from 'node:assert/strict';
import type { CapabilitySetupSchema } from '@/core/presets/types';
import {
  buildZodSchemaFromSetupSchema,
  extractDefaultValuesFromSetupSchema,
} from './schemaFormBuilder';

const sampleSchema: CapabilitySetupSchema = {
  capabilityId: 'passes',
  title: '수강권·회원권 기본 정책',
  description: '회원권 유형과 유효기간을 설정합니다.',
  fields: [
    {
      id: 'defaultPassType',
      label: '회원권 유형',
      type: 'select',
      defaultValue: 'COUNT_BASED',
      options: [
        { label: '횟수제', value: 'COUNT_BASED' },
        { label: '기간제', value: 'PERIOD_BASED' },
      ],
      required: true,
    },
    {
      id: 'defaultValidityDays',
      label: '유효기간',
      type: 'number',
      defaultValue: 90,
      required: true,
    },
    {
      id: 'allowPause',
      label: '일시정지 허용',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'tags',
      label: '분류 태그',
      type: 'tags',
      defaultValue: ['vip', 'regular'],
    },
    {
      id: 'memo',
      label: '메모',
      type: 'textarea',
      defaultValue: '',
      required: false,
    },
  ],
};

function runTests(): void {
  console.log('🧪 [Test Suite] Dynamic Schema Form Builder\n');

  // Test 1: 기본값 추출
  {
    console.log('  ▶ Test 1: 스키마로부터 기본값 추출');
    const defaults = extractDefaultValuesFromSetupSchema(sampleSchema);
    assert.deepEqual(defaults, {
      defaultPassType: 'COUNT_BASED',
      defaultValidityDays: 90,
      allowPause: true,
      tags: ['vip', 'regular'],
      memo: '',
    });

    // 오버라이드 병합
    const withOverrides = extractDefaultValuesFromSetupSchema(sampleSchema, {
      defaultValidityDays: 180,
      allowPause: false,
    });
    assert.equal(withOverrides.defaultValidityDays, 180);
    assert.equal(withOverrides.allowPause, false);
    assert.equal(withOverrides.defaultPassType, 'COUNT_BASED');
    console.log('    ✓ 통과');
  }

  // Test 2: Zod 스키마 생성 및 유효성 검사 (정상 입력)
  {
    console.log('  ▶ Test 2: Zod 유효성 검사 - 정상 데이터 통과');
    const zodSchema = buildZodSchemaFromSetupSchema(sampleSchema);
    const parsed = zodSchema.safeParse({
      defaultPassType: 'PERIOD_BASED',
      defaultValidityDays: '60', // coercion 동작 확인
      allowPause: true,
      tags: ['special'],
      memo: '테스트 메모',
    });

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.defaultPassType, 'PERIOD_BASED');
      assert.equal(parsed.data.defaultValidityDays, 60);
      assert.equal(parsed.data.allowPause, true);
    }
    console.log('    ✓ 통과');
  }

  // Test 3: 필수 입력 누락 시 실패
  {
    console.log('  ▶ Test 3: Zod 유효성 검사 - 필수 필드 누락 검출');
    const zodSchema = buildZodSchemaFromSetupSchema(sampleSchema);
    const parsed = zodSchema.safeParse({
      defaultPassType: '', // 빈 문자열 (required)
      defaultValidityDays: NaN,
      allowPause: true,
      tags: [],
    });

    assert.equal(parsed.success, false);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      assert.ok(fieldErrors.defaultPassType, 'defaultPassType 에러 존재해야 함');
      assert.ok(fieldErrors.defaultValidityDays, 'defaultValidityDays 에러 존재해야 함');
    }
    console.log('    ✓ 통과');
  }

  console.log('\n✨ All schemaFormBuilder tests passed cleanly!\n');
}

runTests();
