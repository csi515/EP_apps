import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  recordActivity,
  listActivities,
  type ActivityItem,
} from './activityService';

const mockStorage = new Map<string, string>();
(global as any).window = {
  localStorage: {
    getItem: (key: string) => mockStorage.get(key) || null,
    setItem: (key: string, val: string) => mockStorage.set(key, val),
    removeItem: (key: string) => mockStorage.delete(key),
  },
};

describe('Universal Activity Stream Service (Phase 4)', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('다형성 타깃(customer)에 대해 활동 이력을 기록하고 조회할 수 있다', async () => {
    const orgId = 'org-act-1';
    const targetType = 'customer';
    const targetId = 'cust-101';

    const act1: ActivityItem = {
      organizationId: orgId,
      targetType,
      targetId,
      actorName: '홍원장',
      activityType: 'created',
      title: '원생 최초 등록',
      content: '방문 상담 후 3개월 수강권 결제 완료',
    };

    const saved1 = await recordActivity(act1);
    assert.ok(saved1.id);
    assert.ok(saved1.createdAt);

    const act2: ActivityItem = {
      organizationId: orgId,
      targetType,
      targetId,
      actorName: '김강사',
      activityType: 'comment_added',
      title: '레슨 특이사항 메모',
      content: '왼손 손가락 번호 지도 필요',
    };

    await recordActivity(act2);

    const timeline = await listActivities(orgId, targetType, targetId);
    assert.equal(timeline.length, 2);
    // 최신순 조회이므로 act2가 먼저 옴
    assert.equal(timeline[0].title, '레슨 특이사항 메모');
    assert.equal(timeline[1].title, '원생 최초 등록');
  });

  it('다른 타깃(task)의 활동은 격리되어 조회되지 않는다', async () => {
    const orgId = 'org-act-1';
    await recordActivity({
      organizationId: orgId,
      targetType: 'task',
      targetId: 'task-999',
      activityType: 'status_changed',
      title: '공정 진입',
    });

    const customerTimeline = await listActivities(orgId, 'customer', 'cust-101');
    assert.equal(customerTimeline.length, 0);

    const taskTimeline = await listActivities(orgId, 'task', 'task-999');
    assert.equal(taskTimeline.length, 1);
  });
});
