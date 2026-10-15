import assert from 'node:assert/strict';
import {
  filterActiveAnnouncements,
  createTenantAnnouncement,
  type TenantAnnouncement,
} from './announcementEngine';

function run() {
  // 1. 공지 생성 유효성 검증
  const invalidDate = createTenantAnnouncement({
    organizationId: 'org-1',
    title: '테스트',
    content: '내용',
    startDate: '2026-10-25',
    endDate: '2026-10-20', // 종료일이 시작일보다 앞섬
  });
  assert.equal(invalidDate.success, false);
  assert.ok(invalidDate.error?.includes('게시 종료일'));

  const validRes = createTenantAnnouncement({
    organizationId: 'org-1',
    title: '여름방학 특별 시간표 개편 안내',
    content: '7월 20일부터 8월 15일까지 오전 특강이 개설됩니다.',
    priority: 'URGENT',
    showAsBanner: true,
    showAsPopup: true,
    startDate: '2026-07-01',
    endDate: '2026-08-15',
    targetAudience: 'ALL',
  });
  assert.equal(validRes.success, true);
  assert.equal(validRes.announcement?.priority, 'URGENT');

  // 2. 활성 공지사항 필터링 및 우선순위 정렬
  const announcements: TenantAnnouncement[] = [
    {
      id: 'ann-1',
      organizationId: 'org-1',
      title: '일반 안내: 주차장 공사 안내',
      content: '지하 1층 주차장 바닥 도색 작업',
      priority: 'NORMAL',
      showAsBanner: true,
      showAsPopup: false,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      targetAudience: 'ALL',
      isActive: true,
      createdAt: '2026-10-01T10:00:00Z',
    },
    {
      id: 'ann-2',
      organizationId: 'org-1',
      title: '긴급 휴원 공지 (태풍 대비)',
      content: '내일(10월 16일) 안전을 위해 전 수업 전면 휴원합니다.',
      priority: 'EMERGENCY',
      showAsBanner: true,
      showAsPopup: true,
      startDate: '2026-10-15',
      endDate: '2026-10-16',
      targetAudience: 'ALL',
      isActive: true,
      createdAt: '2026-10-15T08:00:00Z',
    },
    {
      id: 'ann-3',
      organizationId: 'org-1',
      title: '학부모 전용: 11월 상담 주간 안내',
      content: '학부모 면담 신청',
      priority: 'NORMAL',
      showAsBanner: false,
      showAsPopup: true,
      startDate: '2026-10-10',
      endDate: '2026-10-30',
      targetAudience: 'GUARDIANS',
      isActive: true,
      createdAt: '2026-10-10T12:00:00Z',
    },
    {
      id: 'ann-past',
      organizationId: 'org-1',
      title: '과거 공지',
      content: '이미 지난 공지',
      priority: 'NORMAL',
      showAsBanner: true,
      showAsPopup: false,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      targetAudience: 'ALL',
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
    },
  ];

  // 2026-10-15 기준 ALL 대상 필터링
  const resultAll = filterActiveAnnouncements({
    announcements,
    targetDate: '2026-10-15',
    audience: 'ALL',
  });

  assert.equal(resultAll.totalActiveCount, 3); // ann-1, ann-2, ann-3
  // 긴급도 우선순위: EMERGENCY(ann-2)가 맨 앞에 와야 함
  assert.equal(resultAll.bannerAnnouncements[0].id, 'ann-2');
  assert.equal(resultAll.bannerAnnouncements[0].priority, 'EMERGENCY');
  assert.equal(resultAll.popupAnnouncements.length, 2); // ann-2, ann-3

  // MEMBERS(원생/일반회원) 대상 필터링 시 GUARDIANS 전용 공지(ann-3) 제외 확인
  const resultMembers = filterActiveAnnouncements({
    announcements,
    targetDate: '2026-10-15',
    audience: 'MEMBERS',
  });
  assert.equal(resultMembers.totalActiveCount, 2); // ann-1, ann-2만 포함

  console.log('announcementEngine.test.ts: ok');
}

run();
