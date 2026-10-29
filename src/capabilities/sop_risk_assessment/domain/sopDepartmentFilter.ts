import { readDocumentBody } from './sopStepDocument';

export type SopDepartmentOption = {
  id: string;
  name: string;
  code: string | null;
};

export type SopDepartmentFilter = 'all' | 'unassigned' | string;

export type RiskAssessmentDeptFields = {
  department_id?: string | null;
  snapshot_payload?: unknown;
};

/** 조직 부서 코드가 없으면 이름/ID로 채번용 코드 생성 */
export function deriveDepartmentCode(input: {
  code?: string | null;
  name: string;
  id?: string;
}): string {
  const raw = (input.code ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw) return raw.slice(0, 8);
  const fromName = input.name
    .normalize('NFKD')
    .replace(/[^\w]/g, '')
    .toUpperCase()
    .slice(0, 4);
  if (fromName.length >= 2) return fromName;
  const fromId = (input.id ?? '').replace(/-/g, '').toUpperCase().slice(0, 4);
  return fromId || 'GEN';
}

export function resolveAssessmentDepartmentId(
  doc: RiskAssessmentDeptFields,
  departments: readonly SopDepartmentOption[]
): string | null {
  if (doc.department_id) return doc.department_id;
  const body = readDocumentBody(doc.snapshot_payload);
  const code = body.deptCode.trim().toUpperCase();
  const byCode = departments.find(
    (d) => deriveDepartmentCode(d).toUpperCase() === code || (d.code ?? '').toUpperCase() === code
  );
  if (byCode) return byCode.id;
  const name = body.deptName.trim();
  if (name) {
    const byName = departments.find((d) => d.name.trim() === name);
    if (byName) return byName.id;
  }
  return null;
}

export function filterAssessmentsByDepartment<T extends RiskAssessmentDeptFields>(
  docs: readonly T[],
  departments: readonly SopDepartmentOption[],
  filter: SopDepartmentFilter
): T[] {
  if (filter === 'all') return [...docs];
  return docs.filter((doc) => {
    const deptId = resolveAssessmentDepartmentId(doc, departments);
    if (filter === 'unassigned') return deptId == null;
    return deptId === filter;
  });
}

export function countAssessmentsByDepartment(
  docs: readonly RiskAssessmentDeptFields[],
  departments: readonly SopDepartmentOption[]
): { all: number; unassigned: number; byId: Record<string, number> } {
  const byId: Record<string, number> = {};
  let unassigned = 0;
  for (const doc of docs) {
    const deptId = resolveAssessmentDepartmentId(doc, departments);
    if (!deptId) {
      unassigned += 1;
      continue;
    }
    byId[deptId] = (byId[deptId] ?? 0) + 1;
  }
  return { all: docs.length, unassigned, byId };
}
