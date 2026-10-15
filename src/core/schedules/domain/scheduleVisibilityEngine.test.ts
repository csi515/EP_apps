import assert from 'node:assert/strict';
import {
  resolveScheduleVisibility,
  getStaffThemeColor,
  filterAndSanitizeSchedulesForViewer,
  type StaffScheduleProfile,
  type ViewerContext,
  type BaseScheduleEntity,
} from './scheduleVisibilityEngine';

console.log('Running scheduleVisibilityEngine.test.ts...');

// 1. resolveScheduleVisibility 검증
assert.equal(resolveScheduleVisibility('PRIVATE', 'PUBLIC'), 'PRIVATE');
assert.equal(resolveScheduleVisibility('FREE_BUSY_ONLY', 'PUBLIC'), 'FREE_BUSY_ONLY');
assert.equal(resolveScheduleVisibility(undefined, 'FREE_BUSY_ONLY'), 'FREE_BUSY_ONLY');
assert.equal(resolveScheduleVisibility(undefined, undefined), 'PUBLIC');

// 2. getStaffThemeColor 검증
assert.equal(getStaffThemeColor({ roleTitle: '총괄 원장' }), 'purple');
assert.equal(getStaffThemeColor({ roleTitle: '수석 실장' }), 'indigo');
assert.equal(getStaffThemeColor({ roleTitle: '전임 강사' }), 'teal');
assert.equal(getStaffThemeColor({ roleTitle: '주말 인턴' }), 'amber');
assert.equal(getStaffThemeColor({ roleTitle: '일반 스태프' }), 'slate');

// 3. 테스트 데이터 세팅
const orgId = 'org-100';
const otherOrgId = 'org-999';

const staffMembers: StaffScheduleProfile[] = [
  {
    id: 'staff-owner',
    name: '김사업주',
    organizationId: orgId,
    roleTitle: '대표 원장',
    defaultVisibility: 'PUBLIC',
  },
  {
    id: 'staff-alice',
    name: '이수석',
    organizationId: orgId,
    roleTitle: '수석 실장',
    defaultVisibility: 'PUBLIC',
  },
  {
    id: 'staff-bob',
    name: '박디자이너',
    organizationId: orgId,
    roleTitle: '헤어 디자이너',
    defaultVisibility: 'FREE_BUSY_ONLY',
  },
  {
    id: 'staff-charlie',
    name: '최강사',
    organizationId: orgId,
    roleTitle: '필라테스 강사',
    defaultVisibility: 'PRIVATE',
  },
];

const mockSchedules: BaseScheduleEntity[] = [
  // 1) 앨리스의 일정 (PUBLIC - default)
  {
    id: 'sch-1',
    organizationId: orgId,
    staffId: 'staff-alice',
    staffName: '이수석',
    customerName: '홍길동',
    customerPhone: '010-1111-2222',
    serviceName: '1:1 VIP 시술',
    roomName: '룸 A',
    startsAt: '2026-10-15T10:00:00',
    endsAt: '2026-10-15T11:00:00',
    memo: '고객 알레르기 주의',
  },
  // 2) 밥의 일정 (FREE_BUSY_ONLY - default)
  {
    id: 'sch-2',
    organizationId: orgId,
    staffId: 'staff-bob',
    staffName: '박디자이너',
    customerName: '김철수',
    customerPhone: '010-3333-4444',
    serviceName: '커트 & 펌',
    roomName: '체어 3',
    startsAt: '2026-10-15T11:00:00',
    endsAt: '2026-10-15T12:30:00',
    memo: '첫 방문 고객',
  },
  // 3) 밥의 개별 오버라이드 일정 (PUBLIC 오버라이드)
  {
    id: 'sch-3',
    organizationId: orgId,
    staffId: 'staff-bob',
    staffName: '박디자이너',
    customerName: '이영희',
    customerPhone: '010-5555-6666',
    serviceName: '스타일링 워크숍 (공개)',
    roomName: '메인홀',
    startsAt: '2026-10-15T14:00:00',
    endsAt: '2026-10-15T15:00:00',
    visibility: 'PUBLIC',
  },
  // 4) 찰리의 일정 (PRIVATE - default)
  {
    id: 'sch-4',
    organizationId: orgId,
    staffId: 'staff-charlie',
    staffName: '최강사',
    customerName: '강민수',
    customerPhone: '010-7777-8888',
    serviceName: '개인 레슨',
    startsAt: '2026-10-15T16:00:00',
    endsAt: '2026-10-15T17:00:00',
  },
  // 5) 타 사업장(다른 테넌트)의 일정 (절대 노출 금지)
  {
    id: 'sch-alien',
    organizationId: otherOrgId,
    staffId: 'staff-alien',
    staffName: '외부인',
    customerName: '타사고객',
    startsAt: '2026-10-15T10:00:00',
    endsAt: '2026-10-15T11:00:00',
  },
];

// 시나리오 A: 사업주(Owner)가 전체 일정을 조회할 때
{
  const ownerViewer: ViewerContext = {
    id: 'staff-owner',
    role: 'owner',
    organizationId: orgId,
  };

  const results = filterAndSanitizeSchedulesForViewer({
    viewer: ownerViewer,
    schedules: mockSchedules,
    staffProfiles: staffMembers,
    viewMode: 'all',
  });

  // 타 사업장 일정 sch-alien은 제외되고 4개 모두 열람 가능
  assert.equal(results.length, 4);
  // 마스킹된 일정은 없어야 함
  assert.equal(results.every((r) => !r.isMasked), true);
  // 사업주는 모든 일정을 편집 가능해야 함
  assert.equal(results.every((r) => r.canEdit), true);
  // 찰리의 PRIVATE 일정도 사업주에게는 보임
  const charlieSchedule = results.find((r) => r.original.id === 'sch-4');
  assert.ok(charlieSchedule);
  assert.equal(charlieSchedule.sanitized.customerName, '강민수');
}

// 시나리오 B: 동료 직원(Alice)이 전체 일정을 함께 조회할 때
{
  const aliceViewer: ViewerContext = {
    id: 'staff-alice',
    role: 'staff',
    organizationId: orgId,
  };

  const results = filterAndSanitizeSchedulesForViewer({
    viewer: aliceViewer,
    schedules: mockSchedules,
    staffProfiles: staffMembers,
    viewMode: 'all',
  });

  // 1) 타 사업장(alien) 제외
  // 2) 찰리의 PRIVATE(sch-4) 일정은 타 직원에게 완전 숨김 처리되어 제외!
  // 따라서 alice 본인(sch-1), bob의 FREE_BUSY(sch-2), bob의 PUBLIC(sch-3) 총 3개만 조회되어야 함.
  assert.equal(results.length, 3);
  assert.equal(results.some((r) => r.original.id === 'sch-4'), false);

  // 3) Alice 본인의 일정(sch-1) 검증
  const mySchedule = results.find((r) => r.original.id === 'sch-1')!;
  assert.equal(mySchedule.isOwnSchedule, true);
  assert.equal(mySchedule.isMasked, false);
  assert.equal(mySchedule.canEdit, true);
  assert.equal(mySchedule.sanitized.customerName, '홍길동');
  assert.equal(mySchedule.sanitized.memo, '고객 알레르기 주의');

  // 4) Bob의 FREE_BUSY_ONLY 일정(sch-2) 검증
  const bobBusySchedule = results.find((r) => r.original.id === 'sch-2')!;
  assert.equal(bobBusySchedule.isOwnSchedule, false);
  assert.equal(bobBusySchedule.isMasked, true);
  assert.equal(bobBusySchedule.canEdit, false);
  assert.equal(bobBusySchedule.displayTitle, '예약 중 (바쁨)');
  assert.equal(bobBusySchedule.sanitized.customerName, '예약 중 (비공개)');
  assert.equal(bobBusySchedule.sanitized.customerPhone, undefined); // 마스킹 제거
  assert.equal(bobBusySchedule.sanitized.memo, undefined); // 메모 제거
  assert.equal(bobBusySchedule.colorTheme, 'slate'); // 바쁨 전용 스타일

  // 5) Bob의 PUBLIC 오버라이드 일정(sch-3) 검증
  const bobPublicSchedule = results.find((r) => r.original.id === 'sch-3')!;
  assert.equal(bobPublicSchedule.isOwnSchedule, false);
  assert.equal(bobPublicSchedule.isMasked, false);
  assert.equal(bobPublicSchedule.canEdit, false); // 타 직원 일정은 편집 불가
  assert.equal(bobPublicSchedule.displayTitle, '이영희');
  assert.equal(bobPublicSchedule.sanitized.customerPhone, undefined); // maskCustomerPIIOnPublic=true 로 연락처 보호
}

// 시나리오 C: Alice가 [내 일정만 보기(my_only)] 필터를 적용했을 때
{
  const aliceViewer: ViewerContext = {
    id: 'staff-alice',
    role: 'staff',
    organizationId: orgId,
  };

  const results = filterAndSanitizeSchedulesForViewer({
    viewer: aliceViewer,
    schedules: mockSchedules,
    staffProfiles: staffMembers,
    viewMode: 'my_only',
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].original.id, 'sch-1');
  assert.equal(results[0].isOwnSchedule, true);
}

// 시나리오 D: Alice가 [특정 직원 다중 선택(custom_staff)] - Bob만 선택했을 때
{
  const aliceViewer: ViewerContext = {
    id: 'staff-alice',
    role: 'staff',
    organizationId: orgId,
  };

  const results = filterAndSanitizeSchedulesForViewer({
    viewer: aliceViewer,
    schedules: mockSchedules,
    staffProfiles: staffMembers,
    viewMode: 'custom_staff',
    selectedStaffIds: ['staff-bob'],
  });

  // Bob의 일정 sch-2(FREE_BUSY 마스킹), sch-3(PUBLIC) 총 2개
  assert.equal(results.length, 2);
  assert.ok(results.every((r) => r.original.staffId === 'staff-bob'));
}

// 시나리오 E: Charlie가 본인 일정 조회 시 본인의 PRIVATE 일정이 정상 표시되는지 검증
{
  const charlieViewer: ViewerContext = {
    id: 'staff-charlie',
    role: 'staff',
    organizationId: orgId,
  };

  const results = filterAndSanitizeSchedulesForViewer({
    viewer: charlieViewer,
    schedules: mockSchedules,
    staffProfiles: staffMembers,
    viewMode: 'my_only',
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].original.id, 'sch-4');
  assert.equal(results[0].isOwnSchedule, true);
  assert.equal(results[0].isMasked, false); // 본인에게는 마스킹 없음!
  assert.equal(results[0].sanitized.customerName, '강민수');
  assert.equal(results[0].canEdit, true);
}

console.log('scheduleVisibilityEngine.test.ts: ok (All scenarios verified)');
