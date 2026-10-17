import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WORKLOAD_THRESHOLDS,
  validateWorkloadThresholds,
  determineWorkloadTrafficLight,
  resolveWorkloadDataScope,
  filterWorkloadDataByScope,
  canReassignWorkload,
  calculateYearlyCapacityForecast,
  type TeamMemberWorkloadItem,
  type WorkloadUserContext,
  type WorkloadThresholds,
} from './workloadCapacityEngine';

describe('WorkloadCapacityEngine', () => {
  describe('validateWorkloadThresholds', () => {
    it('기본 임계치는 유효해야 한다', () => {
      const res = validateWorkloadThresholds(DEFAULT_WORKLOAD_THRESHOLDS);
      assert.equal(res.valid, true);
    });

    it('green_max가 10 미만이면 유효하지 않아야 한다', () => {
      const res = validateWorkloadThresholds({ green_max: 5, yellow_max: 80 });
      assert.equal(res.valid, false);
      assert.match(res.error || '', /최소 10%/);
    });

    it('green_max가 yellow_max 이상이면 유효하지 않아야 한다', () => {
      const res = validateWorkloadThresholds({ green_max: 80, yellow_max: 80 });
      assert.equal(res.valid, false);
      assert.match(res.error || '', /작아야 합니다/);
    });

    it('yellow_max가 100을 초과하면 유효하지 않아야 한다', () => {
      const res = validateWorkloadThresholds({ green_max: 70, yellow_max: 105 });
      assert.equal(res.valid, false);
      assert.match(res.error || '', /100% 이하/);
    });
  });

  describe('determineWorkloadTrafficLight', () => {
    it('기본 임계치(75, 85)에서 70%는 green, 80%는 yellow, 90%는 red를 반환해야 한다', () => {
      assert.equal(determineWorkloadTrafficLight(50), 'green');
      assert.equal(determineWorkloadTrafficLight(75), 'green');
      assert.equal(determineWorkloadTrafficLight(76), 'yellow');
      assert.equal(determineWorkloadTrafficLight(85), 'yellow');
      assert.equal(determineWorkloadTrafficLight(86), 'red');
      assert.equal(determineWorkloadTrafficLight(110), 'red');
    });

    it('커스텀 임계치(60, 80)를 지정하면 해당 기준에 맞게 판정해야 한다', () => {
      const custom: WorkloadThresholds = { green_max: 60, yellow_max: 80 };
      assert.equal(determineWorkloadTrafficLight(59, custom), 'green');
      assert.equal(determineWorkloadTrafficLight(60, custom), 'green');
      assert.equal(determineWorkloadTrafficLight(61, custom), 'yellow');
      assert.equal(determineWorkloadTrafficLight(80, custom), 'yellow');
      assert.equal(determineWorkloadTrafficLight(81, custom), 'red');
    });
  });

  describe('resolveWorkloadDataScope', () => {
    it('Owner/Director는 전사 스코프와 필터 변경 및 임계치 관리 권한을 가져야 한다', () => {
      const ownerUser: WorkloadUserContext = {
        userId: 'u-1',
        role: 'owner',
      };
      const scope = resolveWorkloadDataScope(ownerUser);
      assert.equal(scope.scopeType, 'all');
      assert.equal(scope.canChangeDepartmentFilter, true);
      assert.equal(scope.canManageThresholds, true);
    });

    it('Manager는 소속 부서 스코프만 부여되고 부서 필터 변경이 불가능해야 한다', () => {
      const managerUser: WorkloadUserContext = {
        userId: 'u-2',
        role: 'manager',
        departmentId: 'dept-eng',
        departmentName: '개발팀',
      };
      const scope = resolveWorkloadDataScope(managerUser);
      assert.equal(scope.scopeType, 'department');
      assert.equal(scope.accessibleDepartmentId, 'dept-eng');
      assert.equal(scope.canChangeDepartmentFilter, false);
      assert.equal(scope.canManageThresholds, true);
    });

    it('Staff는 본인 스코프만 부여되고 임계치 수정이 불가능해야 한다', () => {
      const staffUser: WorkloadUserContext = {
        userId: 'u-3',
        role: 'staff',
        departmentId: 'dept-eng',
      };
      const scope = resolveWorkloadDataScope(staffUser);
      assert.equal(scope.scopeType, 'self');
      assert.equal(scope.accessibleUserId, 'u-3');
      assert.equal(scope.canChangeDepartmentFilter, false);
      assert.equal(scope.canManageThresholds, false);
    });
  });

  describe('filterWorkloadDataByScope', () => {
    const mockItems: TeamMemberWorkloadItem[] = [
      {
        memberId: 'm-1',
        memberName: '김개발 (개발팀 팀장)',
        departmentId: 'dept-eng',
        departmentName: '개발팀',
        roleTitle: 'Tech Lead',
        assignedTasksCount: 5,
        capacityHoursPerWeek: 40,
        assignedHoursPerWeek: 30,
        workloadRatePercent: 75,
      },
      {
        memberId: 'm-2',
        memberName: '이코딩 (개발팀 팀원)',
        departmentId: 'dept-eng',
        departmentName: '개발팀',
        roleTitle: 'Developer',
        assignedTasksCount: 6,
        capacityHoursPerWeek: 40,
        assignedHoursPerWeek: 36,
        workloadRatePercent: 90,
      },
      {
        memberId: 'm-3',
        memberName: '박디자인 (디자인팀)',
        departmentId: 'dept-design',
        departmentName: '디자인팀',
        roleTitle: 'Product Designer',
        assignedTasksCount: 3,
        capacityHoursPerWeek: 40,
        assignedHoursPerWeek: 32,
        workloadRatePercent: 80,
      },
    ];

    it('all 스코프는 전체 혹은 지정된 부서의 데이터를 반환해야 한다', () => {
      const allScope = resolveWorkloadDataScope({ userId: 'u-1', role: 'owner' });
      const resAll = filterWorkloadDataByScope(mockItems, allScope);
      assert.equal(resAll.length, 3);

      const resFiltered = filterWorkloadDataByScope(mockItems, allScope, 'dept-design');
      assert.equal(resFiltered.length, 1);
      assert.equal(resFiltered[0].memberId, 'm-3');
    });

    it('department 스코프(개발팀 팀장)는 타 부서(디자인팀) 데이터를 엄격히 차단해야 한다', () => {
      const managerScope = resolveWorkloadDataScope({
        userId: 'm-1',
        role: 'manager',
        departmentId: 'dept-eng',
      });
      const res = filterWorkloadDataByScope(mockItems, managerScope);
      assert.equal(res.length, 2);
      assert.ok(res.every((item) => item.departmentId === 'dept-eng'));
      assert.ok(!res.some((item) => item.departmentId === 'dept-design'));
    });

    it('self 스코프는 오직 본인의 데이터만 반환해야 한다', () => {
      const selfScope = resolveWorkloadDataScope({
        userId: 'm-2',
        role: 'staff',
        departmentId: 'dept-eng',
      });
      const res = filterWorkloadDataByScope(mockItems, selfScope);
      assert.equal(res.length, 1);
      assert.equal(res[0].memberId, 'm-2');
    });
  });

  describe('canReassignWorkload', () => {
    const devLead: TeamMemberWorkloadItem = {
      memberId: 'm-1',
      memberName: '김팀장',
      departmentId: 'dept-eng',
      departmentName: '개발팀',
      roleTitle: 'Team Lead',
      assignedTasksCount: 4,
      capacityHoursPerWeek: 40,
      assignedHoursPerWeek: 30,
      workloadRatePercent: 75,
    };

    const devMember: TeamMemberWorkloadItem = {
      memberId: 'm-2',
      memberName: '이팀원',
      departmentId: 'dept-eng',
      departmentName: '개발팀',
      roleTitle: 'Engineer',
      assignedTasksCount: 6,
      capacityHoursPerWeek: 40,
      assignedHoursPerWeek: 38,
      workloadRatePercent: 95,
    };

    const designMember: TeamMemberWorkloadItem = {
      memberId: 'm-3',
      memberName: '박디자이너',
      departmentId: 'dept-design',
      departmentName: '디자인팀',
      roleTitle: 'Designer',
      assignedTasksCount: 3,
      capacityHoursPerWeek: 40,
      assignedHoursPerWeek: 30,
      workloadRatePercent: 75,
    };

    it('동일인 간 업무 재분배는 거부되어야 한다', () => {
      const res = canReassignWorkload({
        taskId: 't-1',
        taskTitle: 'API 개발',
        taskHours: 4,
        fromMember: devLead,
        toMember: devLead,
        operator: { userId: 'm-1', role: 'manager', departmentId: 'dept-eng' },
      });
      assert.equal(res.allowed, false);
      assert.match(res.reason || '', /동일한 담당자/);
    });

    it('일반 팀원은 재분배 권한이 없어야 한다', () => {
      const res = canReassignWorkload({
        taskId: 't-1',
        taskTitle: 'API 개발',
        taskHours: 4,
        fromMember: devMember,
        toMember: devLead,
        operator: { userId: 'm-2', role: 'staff', departmentId: 'dept-eng' },
      });
      assert.equal(res.allowed, false);
      assert.match(res.reason || '', /관리자\(팀장\) 이상의 권한/);
    });

    it('팀장은 본인 부서 내 팀원 간의 업무 재분배를 허용해야 한다', () => {
      const res = canReassignWorkload({
        taskId: 't-1',
        taskTitle: 'API 개발',
        taskHours: 4,
        fromMember: devMember,
        toMember: devLead,
        operator: { userId: 'm-1', role: 'manager', departmentId: 'dept-eng' },
      });
      assert.equal(res.allowed, true);
    });

    it('팀장이 타 부서 팀원에게 업무를 재분배하려 하면 거부되어야 한다', () => {
      const res = canReassignWorkload({
        taskId: 't-1',
        taskTitle: 'API 개발',
        taskHours: 4,
        fromMember: devMember,
        toMember: designMember,
        operator: { userId: 'm-1', role: 'manager', departmentId: 'dept-eng' },
      });
      assert.equal(res.allowed, false);
      assert.match(res.reason || '', /부서 내 팀원 간에만/);
    });

    it('총괄 관리자(Director)는 부서 간 업무 재분배도 허용해야 한다', () => {
      const res = canReassignWorkload({
        taskId: 't-1',
        taskTitle: '크로스 도메인 협업',
        taskHours: 8,
        fromMember: devMember,
        toMember: designMember,
        operator: { userId: 'dir-1', role: 'director' },
      });
      assert.equal(res.allowed, true);
    });
  });

  describe('calculateYearlyCapacityForecast', () => {
    it('계획된 프로젝트 시간이 가용 범위 내(70%)이면 green과 안정 권고사항을 반환해야 한다', () => {
      // 5명 * 50주 * 40시간 = 10,000시간
      // 계획 7,000시간 -> 70%
      const res = calculateYearlyCapacityForecast({
        departmentId: 'dept-1',
        departmentName: '플랫폼개발팀',
        headcount: 5,
        workingWeeksPerYear: 50,
        hoursPerWeekPerPerson: 40,
        totalPlannedProjectHours: 7000,
      });

      assert.equal(res.totalAvailableHours, 10000);
      assert.equal(res.utilizationRatePercent, 70);
      assert.equal(res.surplusOrDeficitHours, 3000);
      assert.equal(res.trafficLight, 'green');
      assert.match(res.recommendation, /안정적인 가용 역량 범위/);
    });

    it('계획된 프로젝트 시간이 90%에 달하면 red와 과부하 경고를 반환해야 한다', () => {
      const res = calculateYearlyCapacityForecast({
        departmentId: 'dept-1',
        departmentName: '플랫폼개발팀',
        headcount: 5,
        workingWeeksPerYear: 50,
        hoursPerWeekPerPerson: 40,
        totalPlannedProjectHours: 9000,
      });

      assert.equal(res.utilizationRatePercent, 90);
      assert.equal(res.trafficLight, 'red');
      assert.match(res.recommendation, /과부하 위험/);
    });
  });
});
