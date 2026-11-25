import { getCoreClient } from '@/lib/supabase';
import {
  canAcknowledgeCourse,
  isMemberAssignedToCourse,
  validateAssignees,
  validateTrainingCourseDraft,
  type TrainingAssigneeTarget,
} from './domain/trainingAckEngine';
import type {
  MyTrainingCourse,
  TrainingAcknowledgmentRow,
  TrainingAssigneeRow,
  TrainingCourseRow,
} from './trainingAckTypes';

export type {
  MyTrainingCourse,
  TrainingAcknowledgmentRow,
  TrainingAssigneeRow,
  TrainingCourseRow,
} from './trainingAckTypes';

async function listMemberDepartmentIds(
  organizationId: string,
  memberId: string,
): Promise<string[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('department_members')
    .select('department_id')
    .eq('organization_id', organizationId)
    .eq('member_id', memberId);
  if (error) throw error;
  return ((data ?? []) as Array<{ department_id: string }>).map((r) => r.department_id);
}

function mapAckRow(raw: Record<string, unknown>): TrainingAcknowledgmentRow {
  return {
    id: String(raw.id),
    organization_id: String(raw.organization_id),
    course_id: String(raw.course_id),
    member_id: String(raw.member_id),
    course_revision: Number(raw.course_revision),
    acked_at: String(raw.acked_at),
    user_agent: (raw.user_agent as string | null) ?? null,
  };
}

export async function listTrainingCourses(
  organizationId: string,
): Promise<TrainingCourseRow[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('training_courses')
    .select('*')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as TrainingCourseRow[]) || [];
}

export async function listAssigneesForCourses(
  organizationId: string,
  courseIds: string[],
): Promise<TrainingAssigneeRow[]> {
  if (courseIds.length === 0) return [];
  const client = getCoreClient();
  const { data, error } = await client
    .from('training_assignees')
    .select('*')
    .eq('organization_id', organizationId)
    .in('course_id', courseIds);
  if (error) throw error;
  return (data as TrainingAssigneeRow[]) || [];
}

export async function createTrainingCourse(
  organizationId: string,
  input: { title: string; body: string; createdBy?: string | null },
): Promise<TrainingCourseRow> {
  const check = validateTrainingCourseDraft(input);
  if (!check.ok) throw new Error(check.reason);
  const client = getCoreClient();
  const { data, error } = await client
    .from('training_courses')
    .insert({
      organization_id: organizationId,
      title: input.title.trim(),
      body: input.body.trim(),
      status: 'draft',
      revision: 1,
      created_by: input.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as TrainingCourseRow;
}

export async function updateTrainingCourse(
  organizationId: string,
  courseId: string,
  input: { title: string; body: string },
): Promise<TrainingCourseRow> {
  const check = validateTrainingCourseDraft(input);
  if (!check.ok) throw new Error(check.reason);
  const client = getCoreClient();
  const { data: existing, error: findErr } = await client
    .from('training_courses')
    .select('*')
    .eq('id', courseId)
    .eq('organization_id', organizationId)
    .single();
  if (findErr || !existing) throw new Error('교육을 찾을 수 없습니다.');

  const row = existing as TrainingCourseRow;
  const title = input.title.trim();
  const body = input.body.trim();
  const contentChanged = row.title !== title || row.body !== body;
  const bumpRevision = row.status === 'published' && contentChanged;
  const { data, error } = await client
    .from('training_courses')
    .update({
      title,
      body,
      revision: bumpRevision ? row.revision + 1 : row.revision,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)
    .eq('organization_id', organizationId)
    .select()
    .single();
  if (error) throw error;
  return data as TrainingCourseRow;
}

export async function replaceTrainingAssignees(
  organizationId: string,
  courseId: string,
  assignees: TrainingAssigneeTarget[],
): Promise<void> {
  const check = validateAssignees(assignees);
  if (!check.ok) throw new Error(check.reason);
  const client = getCoreClient();
  const payload = assignees.map((a) => ({
    department_id: a.departmentId ?? null,
    member_id: a.memberId ?? null,
  }));
  const { error } = await (client as any).rpc('replace_training_assignees', {
    p_organization_id: organizationId,
    p_course_id: courseId,
    p_assignees: payload,
  });
  if (error) throw error;
}

/**
 * 게시 전 제목/본문·배정을 저장한 뒤 status를 published로 전환한다.
 */
export async function saveAndPublishTrainingCourse(
  organizationId: string,
  courseId: string,
  input: { title: string; body: string; assignees: TrainingAssigneeTarget[] },
): Promise<TrainingCourseRow> {
  await updateTrainingCourse(organizationId, courseId, {
    title: input.title,
    body: input.body,
  });
  await replaceTrainingAssignees(organizationId, courseId, input.assignees);
  return publishTrainingCourse(organizationId, courseId);
}

export async function publishTrainingCourse(
  organizationId: string,
  courseId: string,
): Promise<TrainingCourseRow> {
  const assignees = await listAssigneesForCourses(organizationId, [courseId]);
  const check = validateAssignees(
    assignees.map((a) => ({ departmentId: a.department_id, memberId: a.member_id })),
  );
  if (!check.ok) throw new Error(check.reason);

  const client = getCoreClient();
  const { data, error } = await client
    .from('training_courses')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)
    .eq('organization_id', organizationId)
    .select()
    .single();
  if (error) throw error;
  return data as TrainingCourseRow;
}

export async function closeTrainingCourse(
  organizationId: string,
  courseId: string,
): Promise<TrainingCourseRow> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('training_courses')
    .update({
      status: 'closed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)
    .eq('organization_id', organizationId)
    .select()
    .single();
  if (error) throw error;
  return data as TrainingCourseRow;
}

export async function listMyTrainingCourses(
  organizationId: string,
  memberId: string,
): Promise<MyTrainingCourse[]> {
  const [courses, deptIds] = await Promise.all([
    listTrainingCourses(organizationId),
    listMemberDepartmentIds(organizationId, memberId),
  ]);
  const published = courses.filter((c) => c.status === 'published' || c.status === 'closed');
  const assignees = await listAssigneesForCourses(
    organizationId,
    published.map((c) => c.id),
  );
  const byCourse = new Map<string, TrainingAssigneeRow[]>();
  for (const a of assignees) {
    const list = byCourse.get(a.course_id) ?? [];
    list.push(a);
    byCourse.set(a.course_id, list);
  }

  const client = getCoreClient();
  const { data: ackRows, error: ackErr } = await client
    .from('training_acknowledgments')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('member_id', memberId);
  if (ackErr) throw ackErr;
  const ackByCourse = new Map(
    ((ackRows as TrainingAcknowledgmentRow[]) || []).map((r) => [r.course_id, r]),
  );

  const mine: MyTrainingCourse[] = [];
  for (const course of published) {
    const targets = (byCourse.get(course.id) ?? []).map((a) => ({
      departmentId: a.department_id,
      memberId: a.member_id,
    }));
    const assigned = isMemberAssignedToCourse(targets, memberId, deptIds);
    if (!assigned) continue;
    mine.push({
      ...course,
      assigned: true,
      acknowledgment: ackByCourse.get(course.id) ?? null,
    });
  }
  return mine;
}

/**
 * 이수 확인 — SECURITY DEFINER RPC가 published·배정·개정 검증 후 acked_at=now 기록.
 */
export async function acknowledgeTrainingCourse(
  organizationId: string,
  courseId: string,
  memberId: string,
  options: { userAgent?: string | null } = {},
): Promise<TrainingAcknowledgmentRow> {
  const client = getCoreClient();
  const { data: course, error: courseErr } = await client
    .from('training_courses')
    .select('*')
    .eq('id', courseId)
    .eq('organization_id', organizationId)
    .single();
  if (courseErr || !course) throw new Error('교육을 찾을 수 없습니다.');

  const courseRow = course as TrainingCourseRow;
  const [assignees, deptIds, existingAck] = await Promise.all([
    listAssigneesForCourses(organizationId, [courseId]),
    listMemberDepartmentIds(organizationId, memberId),
    client
      .from('training_acknowledgments')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('course_id', courseId)
      .eq('member_id', memberId)
      .maybeSingle(),
  ]);

  if (existingAck.error) throw existingAck.error;
  const assigned = isMemberAssignedToCourse(
    assignees.map((a) => ({ departmentId: a.department_id, memberId: a.member_id })),
    memberId,
    deptIds,
  );
  const ack = existingAck.data
    ? {
        courseRevision: (existingAck.data as TrainingAcknowledgmentRow).course_revision,
      }
    : null;
  const gate = canAcknowledgeCourse({
    status: courseRow.status,
    assigned,
    ack,
    courseRevision: courseRow.revision,
  });
  if (!gate.ok) throw new Error(gate.reason);

  const { data, error } = await (client as any).rpc('acknowledge_training_course', {
    p_organization_id: organizationId,
    p_course_id: courseId,
    p_user_agent: options.userAgent ?? null,
  });
  if (error) throw error;
  if (!data) throw new Error('이수 확인에 실패했습니다.');
  return mapAckRow(data as Record<string, unknown>);
}

export async function listCourseAcknowledgments(
  organizationId: string,
  courseId: string,
): Promise<TrainingAcknowledgmentRow[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('training_acknowledgments')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('course_id', courseId)
    .order('acked_at', { ascending: false });
  if (error) throw error;
  return (data as TrainingAcknowledgmentRow[]) || [];
}

/** 조직 멤버 id → 표시명 (profiles.full_name) */
export async function listTrainingMemberNameMap(
  organizationId: string,
): Promise<Map<string, string>> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('organization_members')
    .select('id, user_id, profiles!organization_members_user_id_fkey(full_name)')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  const map = new Map<string, string>();
  if (!error && data) {
    for (const row of data as unknown as Array<Record<string, unknown>>) {
      const id = String(row.id);
      const profiles = row.profiles as
        | { full_name: string | null }
        | { full_name: string | null }[]
        | null;
      const profile = Array.isArray(profiles) ? profiles[0] : profiles;
      const name = profile?.full_name?.trim();
      map.set(id, name || id.slice(0, 8));
    }
    return map;
  }

  const fallback = await client
    .from('organization_members')
    .select('id, user_id')
    .eq('organization_id', organizationId)
    .eq('is_active', true);
  if (fallback.error) throw fallback.error;
  const rows = (fallback.data ?? []) as Array<{ id: string; user_id: string }>;
  const userIds = rows.map((m) => m.user_id);
  let nameByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await client
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
    nameByUser = new Map(
      ((profiles ?? []) as Array<{ id: string; full_name: string | null }>).map((p) => [
        p.id,
        p.full_name?.trim() || p.id.slice(0, 8),
      ]),
    );
  }
  for (const m of rows) {
    map.set(m.id, nameByUser.get(m.user_id) || m.id.slice(0, 8));
  }
  return map;
}
