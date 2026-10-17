import assert from 'node:assert/strict';
import {
  validateInventorShareSum,
  createPatentInventionDeclaration,
  conductPatentReview,
  calculateInventorRewardDistribution,
  recordInventionRewardPayment,
  type PatentInventor,
} from './patentIpAssetEngine';

function run() {
  console.log('[test:patent-ip-asset] running tests...');

  // 1. 공동 발명자 지분율 합계 100% 검증 (validateInventorShareSum)
  {
    // 1-1) 합계 100% 통과 케이스
    const validInventors: PatentInventor[] = [
      { inventorId: 'inv-1', inventorName: '김수석', department: '연구1팀', sharePercentage: 60 },
      { inventorId: 'inv-2', inventorName: '이책임', department: '연구1팀', sharePercentage: 40 },
    ];
    const val1 = validateInventorShareSum(validInventors);
    assert.equal(val1.isValid, true);
    assert.equal(val1.totalShare, 100);

    // 1-2) 합계 90% (부족) -> 실패
    const invalidInventorsShort: PatentInventor[] = [
      { inventorId: 'inv-1', inventorName: '김수석', department: '연구1팀', sharePercentage: 60 },
      { inventorId: 'inv-2', inventorName: '이책임', department: '연구1팀', sharePercentage: 30 },
    ];
    const val2 = validateInventorShareSum(invalidInventorsShort);
    assert.equal(val2.isValid, false);
    assert.equal(val2.totalShare, 90);
    assert.ok(val2.errorMessage?.includes('반드시 100%이어야 합니다'));

    // 1-3) 합계 110% (초과) -> 실패
    const invalidInventorsOver: PatentInventor[] = [
      { inventorId: 'inv-1', inventorName: '김수석', department: '연구1팀', sharePercentage: 70 },
      { inventorId: 'inv-2', inventorName: '이책임', department: '연구1팀', sharePercentage: 40 },
    ];
    const val3 = validateInventorShareSum(invalidInventorsOver);
    assert.equal(val3.isValid, false);
    assert.equal(val3.totalShare, 110);

    // 1-4) 발명자 없음 -> 실패
    assert.equal(validateInventorShareSum([]).isValid, false);
  }

  // 2. 신규 발명 신고서 접수 (createPatentInventionDeclaration)
  {
    // 지분율 오류 시 접수 불가
    const failCreation = createPatentInventionDeclaration({
      inventionTitle: '고효율 이차전지 음극재 코팅 기술',
      summary: '실리콘 복합 탄소나노튜브 기반의 고용량 음극재 제조 방법',
      techField: '에너지/소재',
      inventors: [
        { inventorId: 'inv-1', inventorName: '김수석', department: '연구1팀', sharePercentage: 50 },
      ], // 50%만 존재
    });
    assert.equal(failCreation.patent, null);
    assert.ok(failCreation.error?.includes('100%이어야 합니다'));

    // 정상 접수
    const successCreation = createPatentInventionDeclaration({
      inventionTitle: '고효율 이차전지 음극재 코팅 기술',
      summary: '실리콘 복합 탄소나노튜브 기반의 고용량 음극재 제조 방법',
      techField: '에너지/소재',
      inventors: [
        { inventorId: 'inv-1', inventorName: '김수석', department: '연구1팀', sharePercentage: 70 },
        { inventorId: 'inv-2', inventorName: '이책임', department: '연구1팀', sharePercentage: 30 },
      ],
    });
    assert.ok(successCreation.patent);
    const patent = successCreation.patent;
    assert.ok(patent.id.startsWith('pat-'));
    assert.equal(patent.status, 'review_pending');
    assert.equal(patent.inventors.length, 2);
  }

  // 3. 사내 특허 심의위원회 워크플로 및 A/B/C 등급 부여 (conductPatentReview)
  {
    const patent = createPatentInventionDeclaration({
      inventionTitle: 'AI 기반 초정밀 공구 마모 진단 센서',
      summary: '고주파 진동 신호 딥러닝 분석을 통한 마모도 예측',
      techField: 'AI/제조',
      inventors: [
        { inventorId: 'inv-1', inventorName: '박연구', department: 'AI랩', sharePercentage: 100 },
      ],
    }).patent!;

    // 승인 시 등급 누락 -> 에러
    const failReview = conductPatentReview(patent, {
      reviewerName: '특허심의위원회',
      status: 'approved',
      reviewComments: '우수 발명임',
    });
    assert.ok(failReview.error?.includes('심의 등급'));

    // A등급 (해외출원) 승인
    const approvedReview = conductPatentReview(patent, {
      reviewerName: '특허심의위원회',
      status: 'approved',
      grade: 'A',
      reviewComments: '글로벌 핵심 기술로 PCT 및 미/유럽 해외 출원 적극 추진',
    });
    assert.equal(approvedReview.error, undefined);
    assert.equal(approvedReview.updatedPatent.status, 'review_completed');
    assert.equal(approvedReview.updatedPatent.review?.grade, 'A');
    assert.equal(approvedReview.updatedPatent.review?.status, 'approved');

    // 반려(노하우 보호 또는 기술 가치 미달)
    const rejectedReview = conductPatentReview(patent, {
      reviewerName: '특허심의위원회',
      status: 'rejected',
      reviewComments: '종래 기술 대비 진보성 부족',
    });
    assert.equal(rejectedReview.updatedPatent.status, 'rejected');
  }

  // 4. 직무발명 보상금 분배 계산 및 지급 기록 (calculateInventorRewardDistribution & recordInventionRewardPayment)
  {
    const inventors: PatentInventor[] = [
      { inventorId: 'inv-1', inventorName: '김수석', department: '연구1팀', sharePercentage: 70 },
      { inventorId: 'inv-2', inventorName: '이책임', department: '연구1팀', sharePercentage: 30 },
    ];

    // 출원 보상금 1,000,000원 분배
    const dist = calculateInventorRewardDistribution(1000000, inventors);
    assert.equal(dist.length, 2);
    assert.equal(dist[0].allocatedAmount, 700000); // 70%
    assert.equal(dist[1].allocatedAmount, 300000); // 30%

    // 3인 단수 보정 케이스 (33.33%, 33.33%, 33.34%)
    const inventors3: PatentInventor[] = [
      { inventorId: 'inv-1', inventorName: 'A', department: 'Lab', sharePercentage: 33.33 },
      { inventorId: 'inv-2', inventorName: 'B', department: 'Lab', sharePercentage: 33.33 },
      { inventorId: 'inv-3', inventorName: 'C', department: 'Lab', sharePercentage: 33.34 },
    ];
    const dist3 = calculateInventorRewardDistribution(1000000, inventors3);
    const sumAllocated = dist3.reduce((s, d) => s + d.allocatedAmount, 0);
    assert.equal(sumAllocated, 1000000, '단수 차이 없이 1원 단위까지 일치해야 함');

    // 출원 보상금 지급 기록
    let patent = createPatentInventionDeclaration({
      inventionTitle: '테스트 발명',
      summary: '요약 설명문',
      techField: '화학',
      inventors,
    }).patent!;

    patent = recordInventionRewardPayment(patent, 'application', {
      totalRewardAmount: 1000000,
    });
    assert.ok(patent.applicationReward);
    assert.equal(patent.applicationReward.isPaid, true);
    assert.equal(patent.applicationReward.totalRewardAmount, 1000000);
    assert.equal(patent.applicationReward.distributions[0].allocatedAmount, 700000);

    // 등록 보상금 지급 기록 (2,000,000원)
    patent = recordInventionRewardPayment(patent, 'registration', {
      totalRewardAmount: 2000000,
    });
    assert.ok(patent.registrationReward);
    assert.equal(patent.registrationReward.isPaid, true);
    assert.equal(patent.registrationReward.totalRewardAmount, 2000000);
    assert.equal(patent.registrationReward.distributions[1].allocatedAmount, 600000);
  }

  console.log('patentIpAssetEngine.test.ts: all assertions passed!');
}

run();
