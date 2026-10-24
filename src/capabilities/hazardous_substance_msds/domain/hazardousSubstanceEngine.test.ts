import assert from 'node:assert/strict';
import {
  validateCasNumber,
  checkStorageCompatibility,
  calculateReagentStockStatus,
  aggregateChemicalUsage,
  type ChemicalReagent,
  type ChemicalUsageRecord,
} from './hazardousSubstanceEngine';

function run() {
  console.log('[test:hazardous-substance-engine] running...');

  // 1. CAS 번호 유효성 검증
  {
    // 물 (H2O): 7732-18-5
    // 773218 -> 7*7 + 7*6 + 3*5 + 2*4 + 1*3 + 8*2 = 49 + 42 + 15 + 8 + 3 + 16 = 133 % 10 = 3 => 실제 물 CAS는 7732-18-5 (digits: 7,7,3,2,1,8 -> check: 5)
    // 아세톤: 67-64-1 (6*4 + 7*3 + 6*2 + 4*1 = 24 + 21 + 12 + 4 = 61 % 10 = 1) -> 정상!
    assert.equal(validateCasNumber('67-64-1').isValid, true);
    // 황산: 7664-93-9 (7*6 + 6*5 + 6*4 + 4*3 + 9*2 + 3*1 = 42 + 30 + 24 + 12 + 18 + 3 = 129 % 10 = 9) -> 정상!
    assert.equal(validateCasNumber('7664-93-9').isValid, true);

    // 형식 오류
    assert.equal(validateCasNumber('12345').isValid, false);
    // 체크섬 불일치
    assert.equal(validateCasNumber('67-64-2').isValid, false);
  }

  // 2. 화학물질 혼합 보관 호환성 매트릭스 검증
  {
    const sulfuricAcid: Pick<ChemicalReagent, 'name' | 'hazardClasses'> = {
      name: '황산 (Sulfuric Acid)',
      hazardClasses: ['acid'],
    };
    const sodiumHydroxide: Pick<ChemicalReagent, 'name' | 'hazardClasses'> = {
      name: '수산화나트륨 (Sodium Hydroxide)',
      hazardClasses: ['base'],
    };
    const nitricAcid: Pick<ChemicalReagent, 'name' | 'hazardClasses'> = {
      name: '질산 (Nitric Acid)',
      hazardClasses: ['acid', 'oxidizer'],
    };
    const ethanol: Pick<ChemicalReagent, 'name' | 'hazardClasses'> = {
      name: '에탄올 (Ethanol)',
      hazardClasses: ['flammable', 'organic_solvent'],
    };

    // 산 + 염기 -> 보관 불가
    const acidBaseRes = checkStorageCompatibility(sulfuricAcid, sodiumHydroxide);
    assert.equal(acidBaseRes.isCompatible, false);
    assert.ok(acidBaseRes.hazardReason?.includes('산성'));

    // 산화제 + 인화성/유기용매 -> 보관 불가
    const oxidizerFlammableRes = checkStorageCompatibility(nitricAcid, ethanol);
    assert.equal(oxidizerFlammableRes.isCompatible, false);
    assert.ok(oxidizerFlammableRes.hazardReason?.includes('폭발'));

    // 산 + 산 -> 보관 가능
    const acidAcidRes = checkStorageCompatibility(sulfuricAcid, sulfuricAcid);
    assert.equal(acidAcidRes.isCompatible, true);
  }

  // 3. 재고 상태 판정
  {
    assert.equal(calculateReagentStockStatus(0, 100), 'critical');
    assert.equal(calculateReagentStockStatus(50, 100), 'warning');
    assert.equal(calculateReagentStockStatus(150, 100), 'normal');
  }

  // 4. 폐액 및 사용 통계 집계
  {
    const records: ChemicalUsageRecord[] = [
      {
        id: '1',
        reagentId: 'r1',
        reagentName: '염산',
        usedAt: '2026-10-01',
        userId: 'u1',
        userName: '김연구원',
        usedAmount: 100,
        purpose: '합성 반응',
        wasteGeneratedAmount: 80,
        wasteCategory: 'acid_waste',
      },
      {
        id: '2',
        reagentId: 'r2',
        reagentName: '에탄올',
        usedAt: '2026-10-02',
        userId: 'u1',
        userName: '김연구원',
        usedAmount: 200,
        purpose: '세척',
        wasteGeneratedAmount: 150,
        wasteCategory: 'organic_waste',
      },
    ];

    const summary = aggregateChemicalUsage(records);
    assert.equal(summary.totalUsageCount, 2);
    assert.equal(summary.totalWasteAmount, 230);
    assert.equal(summary.wasteByCategory.acid_waste, 80);
    assert.equal(summary.wasteByCategory.organic_waste, 150);
  }

  console.log('[test:hazardous-substance-engine] ok');
}

run();
