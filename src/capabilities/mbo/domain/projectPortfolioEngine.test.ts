import assert from 'node:assert/strict';
import {
  buildYearMonthBuckets,
  collectAvailableYears,
  filterProjectsByMonth,
  filterProjectsByPerson,
  filterProjectsByYear,
  groupProjectsByPerson,
  projectOverlapsRange,
  resolvePortfolioProjects,
  summarizePortfolio,
  type PortfolioProject,
} from './projectPortfolioEngine';

console.log('--- Testing projectPortfolioEngine ---');

const SAMPLE: PortfolioProject[] = [
  {
    id: 'p1',
    title: '친환경 촉매 합성 과제',
    ownerId: 'u-kim',
    ownerName: '김수석',
    status: 'in_progress',
    startDate: '2026-01-15',
    targetDate: '2026-06-30',
    progressRate: 40,
  },
  {
    id: 'p2',
    title: 'XRD 신뢰성 평가',
    ownerId: 'u-lee',
    ownerName: '이선임',
    status: 'approved',
    startDate: '2026-03-01',
    targetDate: '2026-03-31',
    progressRate: 70,
  },
  {
    id: 'p3',
    title: '특허 선행기술 조사',
    ownerId: 'u-kim',
    ownerName: '김수석',
    status: 'completed',
    startDate: '2025-11-01',
    targetDate: '2026-01-20',
    progressRate: 100,
  },
  {
    id: 'p4',
    title: '차기 연도 로드맵',
    ownerId: null,
    ownerName: '박센터장',
    status: 'draft',
    startDate: '2027-01-01',
    targetDate: '2027-12-31',
    progressRate: 0,
  },
];

// 1) 연도별 필터
{
  const y2026 = filterProjectsByYear(SAMPLE, 2026);
  assert.equal(y2026.length, 3);
  assert.ok(y2026.every((p) => p.id !== 'p4'));
  const y2027 = filterProjectsByYear(SAMPLE, 2027);
  assert.equal(y2027.length, 1);
  assert.equal(y2027[0].id, 'p4');
  console.log('✅ Case 1: filterProjectsByYear');
}

// 2) 월별 필터 (기간 겹침)
{
  const mar = filterProjectsByMonth(SAMPLE, 2026, 3);
  assert.equal(mar.length, 2); // p1 spans Jan-Jun, p2 is March only
  assert.ok(mar.some((p) => p.id === 'p1'));
  assert.ok(mar.some((p) => p.id === 'p2'));

  const jan = filterProjectsByMonth(SAMPLE, 2026, 1);
  assert.ok(jan.some((p) => p.id === 'p1'));
  assert.ok(jan.some((p) => p.id === 'p3')); // 2025-11 ~ 2026-01
  assert.ok(!jan.some((p) => p.id === 'p2'));
  console.log('✅ Case 2: filterProjectsByMonth overlap');
}

// 3) 개인별 그룹핑
{
  const groups = groupProjectsByPerson(SAMPLE);
  const kim = groups.find((g) => g.ownerName === '김수석');
  assert.ok(kim);
  assert.equal(kim!.projects.length, 2);
  assert.equal(kim!.averageProgressRate, 70); // (40+100)/2
  assert.equal(filterProjectsByPerson(SAMPLE, 'u-lee').length, 1);
  console.log('✅ Case 3: groupProjectsByPerson');
}

// 4) 연간 12개월 버킷 + 요약
{
  const buckets = buildYearMonthBuckets(SAMPLE, 2026);
  assert.equal(buckets.length, 12);
  assert.equal(buckets[2].month, 3);
  assert.equal(buckets[2].projects.length, 2);

  const summary = summarizePortfolio(filterProjectsByYear(SAMPLE, 2026));
  assert.equal(summary.totalCount, 3);
  assert.equal(summary.completedCount, 1);
  assert.ok(summary.inProgressCount >= 1);
  assert.ok(summary.averageProgressRate > 0);
  console.log('✅ Case 4: year buckets + summarizePortfolio');
}

// 5) resolvePortfolioProjects + 연도 목록
{
  const yearView = resolvePortfolioProjects(SAMPLE, 'year', { year: 2026 });
  assert.equal(yearView.length, 3);
  const monthView = resolvePortfolioProjects(SAMPLE, 'month', { year: 2026, month: 3 });
  assert.equal(monthView.length, 2);
  const personView = resolvePortfolioProjects(SAMPLE, 'person', {
    year: 2026,
    ownerKey: 'id:u-kim',
  });
  assert.equal(personView.length, 2);

  const years = collectAvailableYears(SAMPLE, 2026);
  assert.ok(years.includes(2025));
  assert.ok(years.includes(2026));
  assert.ok(years.includes(2027));

  const start = new Date(2026, 5, 1);
  const end = new Date(2026, 5, 30);
  assert.equal(projectOverlapsRange(SAMPLE[0], start, end), true); // p1 until Jun 30
  console.log('✅ Case 5: resolvePortfolioProjects + collectAvailableYears');
}

console.log('🎉 All projectPortfolioEngine tests passed!');
