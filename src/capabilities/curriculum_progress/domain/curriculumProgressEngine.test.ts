import assert from 'node:assert/strict';
import {
  calculateCurriculumProgress,
  evaluateLevelAdvancement,
  generateMonthlyGrowthReport,
  type CurriculumItemDefinition,
  type StudentProgressRecord,
} from './curriculumProgressEngine';

function run() {
  const dummyItems: CurriculumItemDefinition[] = [
    { id: 'item-1', levelId: 'lv-1', title: '단원 1: 기본 음계', sortOrder: 1, required: true },
    { id: 'item-2', levelId: 'lv-1', title: '단원 2: 박자 연습', sortOrder: 2, required: true },
    { id: 'item-3', levelId: 'lv-1', title: '단원 3: 화음 연주', sortOrder: 3, required: false },
    { id: 'item-4', levelId: 'lv-1', title: '단원 4: 실전 연주', sortOrder: 4, required: true },
  ];

  // 1. calculateCurriculumProgress
  // 1-1. 빈 아이템 목록
  const emptyRes = calculateCurriculumProgress([], []);
  assert.equal(emptyRes.totalItems, 0);
  assert.equal(emptyRes.progressPercent, 0);
  assert.equal(emptyRes.isLevelCompleted, true);

  // 1-2. 부분 완료 (2개 완료, 1개 마스터)
  const partialRecords: StudentProgressRecord[] = [
    { curriculumItemId: 'item-1', status: 'completed' },
    { curriculumItemId: 'item-2', status: 'mastered' },
    { curriculumItemId: 'item-3', status: 'in_progress' },
  ];
  const partialRes = calculateCurriculumProgress(dummyItems, partialRecords);
  assert.equal(partialRes.totalItems, 4);
  assert.equal(partialRes.completedItems, 2);
  assert.equal(partialRes.masteredItems, 1);
  assert.equal(partialRes.progressPercent, 50);
  assert.equal(partialRes.isLevelCompleted, false);
  assert.equal(partialRes.earnedBadge, undefined);

  // 1-3. 전체 완료
  const completeRecords: StudentProgressRecord[] = dummyItems.map((item) => ({
    curriculumItemId: item.id,
    status: 'completed',
  }));
  const completeRes = calculateCurriculumProgress(dummyItems, completeRecords);
  assert.equal(completeRes.progressPercent, 100);
  assert.equal(completeRes.isLevelCompleted, true);
  assert.equal(completeRes.earnedBadge, 'COURSE_COMPLETED');

  // 1-4. 전체 마스터
  const masterRecords: StudentProgressRecord[] = dummyItems.map((item) => ({
    curriculumItemId: item.id,
    status: 'mastered',
  }));
  const masterRes = calculateCurriculumProgress(dummyItems, masterRecords);
  assert.equal(masterRes.progressPercent, 100);
  assert.equal(masterRes.masteredItems, 4);
  assert.equal(masterRes.earnedBadge, 'PERFECT_MASTER');

  // 2. evaluateLevelAdvancement
  const criteria = {
    minProgressPercent: 75,
    requireAllMandatory: true,
    minMasteredCount: 1,
    badgeOnPass: 'PIANO_LEVEL_1_CERTIFIED',
  };

  // 2-1. 필수 단원 누락 불합격
  const missingMandatoryRecords: StudentProgressRecord[] = [
    { curriculumItemId: 'item-1', status: 'completed' },
    { curriculumItemId: 'item-2', status: 'mastered' },
    { curriculumItemId: 'item-3', status: 'completed' },
  ];
  const failMandatory = evaluateLevelAdvancement(dummyItems, missingMandatoryRecords, criteria);
  assert.equal(failMandatory.passed, false);
  assert.deepEqual(failMandatory.missingMandatoryItemIds, ['item-4']);

  // 2-2. 진도율 미달
  const lowProgressRecords: StudentProgressRecord[] = [
    { curriculumItemId: 'item-1', status: 'completed' },
    { curriculumItemId: 'item-2', status: 'mastered' },
  ];
  const failPercent = evaluateLevelAdvancement(dummyItems, lowProgressRecords, criteria);
  assert.equal(failPercent.passed, false);
  assert.equal(failPercent.currentPercent, 50);

  // 2-3. 합격 및 승급 뱃지
  const passRecords: StudentProgressRecord[] = [
    { curriculumItemId: 'item-1', status: 'completed' },
    { curriculumItemId: 'item-2', status: 'mastered' },
    { curriculumItemId: 'item-3', status: 'in_progress' },
    { curriculumItemId: 'item-4', status: 'completed' },
  ];
  const passRes = evaluateLevelAdvancement(dummyItems, passRecords, criteria);
  assert.equal(passRes.passed, true);
  assert.equal(passRes.awardedBadge, 'PIANO_LEVEL_1_CERTIFIED');
  assert.equal(passRes.missingMandatoryItemIds.length, 0);

  // 3. generateMonthlyGrowthReport
  // 3-1. EXCELLENT 등급
  const excellentReport = generateMonthlyGrowthReport({
    studentName: '김민수',
    yearMonth: '2026-10',
    attendanceRate: 95,
    practiceMinutes: 300,
    lessonsCount: 8,
    completedItemsCount: 3,
    instructorComment: '음악적 표현력이 비약적으로 발전했습니다.',
  });
  assert.equal(excellentReport.performanceGrade, 'EXCELLENT');
  assert.equal(excellentReport.metrics.practiceHours, 5);
  assert.ok(excellentReport.summaryText.includes('5시간의 연습'));
  assert.ok(excellentReport.summaryText.includes('음악적 표현력'));

  // 3-2. NEEDS_EFFORT 등급
  const effortReport = generateMonthlyGrowthReport({
    studentName: '이영희',
    yearMonth: '2026-10',
    attendanceRate: 55,
    practiceMinutes: 60,
    lessonsCount: 4,
    completedItemsCount: 0,
  });
  assert.equal(effortReport.performanceGrade, 'NEEDS_EFFORT');
  assert.ok(effortReport.headline.includes('동기 부여와 출석 독려'));
  assert.ok(effortReport.summaryText.includes('정기 레슨 참석'));

  console.log('✅ curriculumProgressEngine tests all passed!');
}

run();
