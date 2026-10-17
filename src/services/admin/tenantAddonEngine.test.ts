import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAddonBilling,
  getAvailableAddonCapabilities,
  validateAddonAddition,
  validateAddonRemoval,
  mergeEffectiveCapabilities,
} from './tenantAddonEngine';
import { getIndustryPreset } from '@/app/presets/presetRegistry';

describe('TenantAddonEngine', () => {
  describe('calculateAddonBilling', () => {
    it('Pro 플랜에 애드온 3개 장착 시 기본료 29,000 + 애드온 60,000 = 총 89,000원을 계산해야 한다', () => {
      const billing = calculateAddonBilling('Pro', ['approval_workflow', 'resources', 'patent_ip_asset']);
      assert.equal(billing.base_fee, 29000);
      assert.equal(billing.addons_total, 60000);
      assert.equal(billing.total_monthly_fee, 89000);
    });

    it('Free Trial 플랜은 기본료 0원으로 계산해야 한다', () => {
      const billing = calculateAddonBilling('Free Trial', ['resources']);
      assert.equal(billing.base_fee, 0);
      assert.equal(billing.addons_total, 20000);
      assert.equal(billing.total_monthly_fee, 20000);
    });

    it('애드온이 없는 경우 기본료만 청구되어야 한다', () => {
      const billing = calculateAddonBilling('Enterprise', []);
      assert.equal(billing.base_fee, 59000);
      assert.equal(billing.addons_total, 0);
      assert.equal(billing.total_monthly_fee, 59000);
    });
  });

  describe('getAvailableAddonCapabilities', () => {
    it('피아노 학원 프리셋 기본 기능 및 장착된 애드온은 추가 가능 목록에서 제외되어야 한다', () => {
      const pianoPreset = getIndustryPreset('piano')!;
      const baseCaps = pianoPreset.capabilities as string[];

      const currentAddons = ['patent_ip_asset'];
      const available = getAvailableAddonCapabilities('piano', currentAddons);

      // 1. 프리셋 기본 기능이 목록에 없어야 함
      baseCaps.forEach((baseCap) => {
        const found = available.some((opt) => opt.id === baseCap);
        assert.equal(found, false, `프리셋 기본 기능 [${baseCap}]은 추가 후보에 없어야 합니다.`);
      });

      // 2. 이미 장착된 애드온도 목록에 없어야 함
      assert.equal(
        available.some((opt) => opt.id === 'patent_ip_asset'),
        false,
        '이미 장착된 애드온은 추가 후보에 없어야 합니다.'
      );

      // 3. 다른 미장착 기능(예: resources)은 목록에 포함되어야 함
      if (!baseCaps.includes('resources')) {
        assert.ok(available.some((opt) => opt.id === 'resources'));
      }
    });
  });

  describe('validateAddonAddition', () => {
    const presetCaps = ['attendance', 'passes', 'roster'];
    const currentAddons = ['approval_workflow'];

    it('미장착된 유효한 Capability는 추가 허용되어야 한다', () => {
      const res = validateAddonAddition('patent_ip_asset', currentAddons, presetCaps);
      assert.equal(res.valid, true);
    });

    it('프리셋 기본 기능은 애드온으로 추가할 수 없어야 한다', () => {
      const res = validateAddonAddition('attendance', currentAddons, presetCaps);
      assert.equal(res.valid, false);
      assert.match(res.error || '', /기본 제공 중인 기능/);
    });

    it('이미 장착된 애드온은 중복 추가할 수 없어야 한다', () => {
      const res = validateAddonAddition('approval_workflow', currentAddons, presetCaps);
      assert.equal(res.valid, false);
      assert.match(res.error || '', /이미 장착된 애드온/);
    });

    it('존재하지 않는 가짜 식별자는 추가할 수 없어야 한다', () => {
      const res = validateAddonAddition('non_existent_magic_module', currentAddons, presetCaps);
      assert.equal(res.valid, false);
      assert.match(res.error || '', /존재하지 않는 Capability/);
    });
  });

  describe('validateAddonRemoval', () => {
    it('현재 장착된 애드온은 정상 삭제 허용되어야 한다', () => {
      const res = validateAddonRemoval('patent_ip_asset', ['patent_ip_asset', 'resources']);
      assert.equal(res.valid, true);
    });

    it('목록에 없는 애드온 삭제 요청은 거부되어야 한다', () => {
      const res = validateAddonRemoval('unknown_cap', ['patent_ip_asset']);
      assert.equal(res.valid, false);
      assert.match(res.error || '', /존재하지 않습니다/);
    });
  });

  describe('mergeEffectiveCapabilities', () => {
    it('프리셋 기본 기능과 애드온이 중복 없이 합집합으로 안전하게 병합되어야 한다', () => {
      const preset = ['attendance', 'passes'];
      const addons = ['passes', 'patent_ip_asset', 'resources'];
      const merged = mergeEffectiveCapabilities(preset, addons);

      assert.equal(merged.length, 4);
      assert.ok(merged.includes('attendance'));
      assert.ok(merged.includes('passes'));
      assert.ok(merged.includes('patent_ip_asset'));
      assert.ok(merged.includes('resources'));
    });
  });
});
