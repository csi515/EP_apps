import { getCoreClient } from '@/lib/supabase';
import type { TrainingAssigneeTarget } from '../domain/trainingAckEngine';
import {
  listAssigneesForCourses,
  listTrainingCourses,
  listTrainingMemberNameMap,
  type TrainingCourseRow,
} from '../trainingAckService';

export type TrainingOption = { id: string; name: string };

export async function loadTrainingDepartments(
  organizationId: string,
): Promise<TrainingOption[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('departments')
    .select('id, name')
    .eq('organization_id', organizationId)
    .order('name');
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string; name: string }>).map((d) => ({
    id: d.id,
    name: d.name,
  }));
}

export async function loadTrainingMemberOptions(
  organizationId: string,
): Promise<TrainingOption[]> {
  const nameMap = await listTrainingMemberNameMap(organizationId);
  return Array.from(nameMap.entries()).map(([id, name]) => ({ id, name }));
}

export async function loadTrainingCoursesBundle(organizationId: string): Promise<{
  courses: TrainingCourseRow[];
  assigneesByCourse: Record<string, TrainingAssigneeTarget[]>;
}> {
  const rows = await listTrainingCourses(organizationId);
  const assignees = await listAssigneesForCourses(
    organizationId,
    rows.map((r) => r.id),
  );
  const map: Record<string, TrainingAssigneeTarget[]> = {};
  for (const a of assignees) {
    const list = map[a.course_id] ?? [];
    list.push({ departmentId: a.department_id, memberId: a.member_id });
    map[a.course_id] = list;
  }
  return { courses: rows, assigneesByCourse: map };
}
