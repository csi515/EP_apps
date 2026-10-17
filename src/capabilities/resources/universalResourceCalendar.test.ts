import assert from 'node:assert/strict';
import {
  canUserApproveReservation,
  determineInitialReservationStatus,
  resourceRangesOverlap,
  resourceReservationsConflict,
  type BookableResource,
  type UniversalResourceMetadata,
  type ResourceReservationStatus,
} from './index';

import './domain/equipmentLogbookEngine.test';

function run() {
  console.log('[test:universal-resource-calendar] running tests...');

  // 1. 초기 예약 상태 분기 (determineInitialReservationStatus)
  {
    // require_approval: true -> 'pending'
    const resWithApproval = {
      metadata: { require_approval: true },
    };
    assert.equal(determineInitialReservationStatus(resWithApproval), 'pending');

    // require_approval: false -> 'approved'
    const resWithoutApproval = {
      metadata: { require_approval: false },
    };
    assert.equal(determineInitialReservationStatus(resWithoutApproval), 'approved');

    // metadata 없음/undefined -> 'approved' (기본 즉시 확정)
    assert.equal(determineInitialReservationStatus({}), 'approved');
    assert.equal(determineInitialReservationStatus({ metadata: null }), 'approved');
  }

  // 2. 동적 승인권자 권한 판별 (canUserApproveReservation)
  {
    // 2-1) 슈퍼관리자/대표/원장/관리자(owner, admin, director, super_admin)는 설정 무관 전권 승인 권한 보유
    const resourceWithStaffApprover: BookableResource = {
      id: 'res-1',
      organization_id: 'org-1',
      kind: 'room',
      name: '대회의실',
      capacity: 10,
      open_time: '09:00',
      close_time: '18:00',
      is_active: true,
      metadata: {
        require_approval: true,
        approver_type: 'staff',
        approver_id: 'staff-123',
        approver_name: '김총무',
      },
    };

    assert.equal(
      canUserApproveReservation(resourceWithStaffApprover, { role: 'owner' }),
      true,
      'Owner는 항상 승인 가능'
    );
    assert.equal(
      canUserApproveReservation(resourceWithStaffApprover, { role: 'admin' }),
      true,
      'Admin은 항상 승인 가능'
    );
    assert.equal(
      canUserApproveReservation(resourceWithStaffApprover, { role: 'director' }),
      true,
      'Director는 항상 승인 가능'
    );
    assert.equal(
      canUserApproveReservation(resourceWithStaffApprover, { role: 'super_admin' }),
      true,
      'Super Admin은 항상 승인 가능'
    );

    // 2-2) require_approval: false인 경우 일반 직원은 승인 대상 아님 (false)
    const resourceNoApproval: BookableResource = {
      ...resourceWithStaffApprover,
      metadata: { require_approval: false },
    };
    assert.equal(
      canUserApproveReservation(resourceNoApproval, { role: 'staff', staffId: 'staff-123' }),
      false,
      '승인이 필요 없는 자원은 일반 직원 승인 권한 없음'
    );

    // 2-3) approver_type: 'staff'일 때 지정된 담당자만 승인 가능
    assert.equal(
      canUserApproveReservation(resourceWithStaffApprover, { role: 'staff', staffId: 'staff-123' }),
      true,
      '지정된 staffId 일치 시 승인 허용'
    );
    assert.equal(
      canUserApproveReservation(resourceWithStaffApprover, { role: 'staff', userId: 'staff-123' }),
      true,
      '지정된 userId 일치 시 승인 허용'
    );
    assert.equal(
      canUserApproveReservation(resourceWithStaffApprover, { role: 'staff', staffId: 'other-staff' }),
      false,
      '일치하지 않는 일반 직원은 승인 불가'
    );

    // 2-4) approver_type: 'role'일 때 지정된 직급만 승인 가능
    const resourceWithRoleApprover: BookableResource = {
      id: 'res-2',
      organization_id: 'org-1',
      kind: 'equipment',
      name: '법인 차량 1호',
      capacity: 5,
      open_time: '08:00',
      close_time: '20:00',
      is_active: true,
      metadata: {
        category: 'vehicle',
        require_approval: true,
        approver_type: 'role',
        approver_id: 'manager',
        approver_name: '부서장 / 팀장',
      },
    };

    assert.equal(
      canUserApproveReservation(resourceWithRoleApprover, { role: 'manager' }),
      true,
      '지정된 role 일치 시 승인 허용'
    );
    assert.equal(
      canUserApproveReservation(resourceWithRoleApprover, { role: 'staff' }),
      false,
      '다른 role은 승인 불가'
    );
  }

  // 3. 동일 시간대 중복 예약 원천 차단 검증 (overlap.ts)
  {
    // 3-1) 시간대 범위 겹침 (resourceRangesOverlap)
    // 10:00 ~ 11:00 vs 10:30 ~ 11:30 -> 겹침 (true)
    assert.equal(
      resourceRangesOverlap('2026-10-18T10:00:00Z', '2026-10-18T11:00:00Z', '2026-10-18T10:30:00Z', '2026-10-18T11:30:00Z'),
      true
    );
    // 10:00 ~ 11:00 vs 11:00 ~ 12:00 -> 경계점 맞닿음: [start, end) 반개구간이므로 안 겹침 (false)
    assert.equal(
      resourceRangesOverlap('2026-10-18T10:00:00Z', '2026-10-18T11:00:00Z', '2026-10-18T11:00:00Z', '2026-10-18T12:00:00Z'),
      false
    );
    // 10:00 ~ 11:00 vs 09:00 ~ 10:00 -> 안 겹침 (false)
    assert.equal(
      resourceRangesOverlap('2026-10-18T10:00:00Z', '2026-10-18T11:00:00Z', '2026-10-18T09:00:00Z', '2026-10-18T10:00:00Z'),
      false
    );

    // 3-2) 자원 예약 충돌 판정 (resourceReservationsConflict)
    const baseRes = {
      resourceId: 'res-room-1',
      startsAt: '2026-10-18T14:00:00Z',
      endsAt: '2026-10-18T15:00:00Z',
      status: 'approved' as ResourceReservationStatus,
    };

    // 동일 자원 + 겹치는 시간 + status 'pending' -> 충돌 (true)
    assert.equal(
      resourceReservationsConflict(baseRes, {
        resourceId: 'res-room-1',
        startsAt: '2026-10-18T14:30:00Z',
        endsAt: '2026-10-18T15:30:00Z',
        status: 'pending',
      }),
      true
    );

    // 서로 다른 자원 -> 충돌 안 함 (false)
    assert.equal(
      resourceReservationsConflict(baseRes, {
        resourceId: 'res-room-2',
        startsAt: '2026-10-18T14:30:00Z',
        endsAt: '2026-10-18T15:30:00Z',
        status: 'approved',
      }),
      false
    );

    // 이미 취소/반려된 예약과의 시간 겹침 -> 충돌 안 함 (false)
    assert.equal(
      resourceReservationsConflict(baseRes, {
        resourceId: 'res-room-1',
        startsAt: '2026-10-18T14:30:00Z',
        endsAt: '2026-10-18T15:30:00Z',
        status: 'cancelled',
      }),
      false
    );
    assert.equal(
      resourceReservationsConflict(baseRes, {
        resourceId: 'res-room-1',
        startsAt: '2026-10-18T14:30:00Z',
        endsAt: '2026-10-18T15:30:00Z',
        status: 'rejected',
      }),
      false
    );
  }

  // 4. 자원 카테고리별 메타데이터 규격 계약 검증
  {
    // 4-1) 차량 (vehicle) 메타데이터
    const vehicleMeta: UniversalResourceMetadata = {
      category: 'vehicle',
      plate_number: '12가 3456',
      vehicle_model: '카니발 9인승',
      fuel_type: '디젤',
      parking_location: '지하 2층 B-04',
      require_approval: true,
      approver_type: 'staff',
      approver_id: 'driver-01',
      approver_name: '정기사',
    };
    assert.equal(vehicleMeta.category, 'vehicle');
    assert.equal(vehicleMeta.plate_number, '12가 3456');

    // 4-2) 회의실 (meeting_room) 메타데이터
    const meetingRoomMeta: UniversalResourceMetadata = {
      category: 'meeting_room',
      has_projector: true,
      has_video_conference: true,
      max_occupancy: 12,
      require_approval: false,
    };
    assert.equal(meetingRoomMeta.category, 'meeting_room');
    assert.equal(meetingRoomMeta.has_projector, true);
    assert.equal(meetingRoomMeta.has_video_conference, true);
    assert.equal(meetingRoomMeta.max_occupancy, 12);

    // 4-3) 보건실/상담실 (health_room) 메타데이터
    const healthRoomMeta: UniversalResourceMetadata = {
      category: 'health_room',
      slot_duration_minutes: 30,
      is_private_consultation: true,
      require_approval: true,
      approver_type: 'role',
      approver_id: 'manager',
    };
    assert.equal(healthRoomMeta.slot_duration_minutes, 30);
    assert.equal(healthRoomMeta.is_private_consultation, true);

    // 4-4) 디스플레이 (display) 메타데이터
    const displayMeta: UniversalResourceMetadata = {
      category: 'display',
      screen_resolution: '3840x2160 (4K UHD)',
      display_location: '본관 1층 로비 메인 스크린',
      require_approval: true,
      approver_type: 'staff',
      approver_id: 'media-admin-01',
    };
    assert.equal(displayMeta.screen_resolution, '3840x2160 (4K UHD)');
    assert.equal(displayMeta.display_location, '본관 1층 로비 메인 스크린');
  }

  console.log('universalResourceCalendar.test.ts: all assertions passed!');
}

run();
