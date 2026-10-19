/** MBO 평가 상태 머신. DB RPC와 같은 전이만 허용한다. */

export type MboEvalWorkflow = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'LOCKED';

export type MboActor = 'author' | 'evaluator' | 'owner';

const FINAL: ReadonlySet<MboEvalWorkflow> = new Set(['APPROVED', 'LOCKED']);

export function canEmployeeMutate(status: MboEvalWorkflow): boolean {
  return status === 'DRAFT';
}

export function submitMboEvaluation(status: MboEvalWorkflow, actor: MboActor): MboEvalWorkflow {
  if (actor !== 'author' && actor !== 'evaluator') {
    throw new Error('작성자 또는 지정 평가자만 제출할 수 있습니다.');
  }
  if (status !== 'DRAFT') {
    throw new Error('DRAFT 상태에서만 SUBMITTED로 전이할 수 있습니다.');
  }
  return 'SUBMITTED';
}

export function approveMboEvaluation(
  status: MboEvalWorkflow,
  actor: MboActor,
  scorePayload: { score?: number } | null,
  comment: string
): { status: MboEvalWorkflow; comment: string; score: number | null } {
  if (actor !== 'evaluator' && actor !== 'owner') {
    throw new Error('지정 평가자 또는 사업주만 승인할 수 있습니다.');
  }
  if (status !== 'SUBMITTED' && status !== 'DRAFT') {
    throw new Error('이미 확정된 평가는 승인할 수 없습니다.');
  }
  if (comment.trim().length === 0) {
    throw new Error('승인 코멘트가 필요합니다.');
  }
  const score = scorePayload?.score;
  if (score != null && (score < 0 || score > 100)) {
    throw new Error('점수는 0에서 100 사이여야 합니다.');
  }
  return { status: 'APPROVED', comment: comment.trim(), score: score ?? null };
}

export function assertStaffCannotTouchFinal(status: MboEvalWorkflow, actor: MboActor): void {
  if (FINAL.has(status) && actor === 'author') {
    throw new Error('APPROVED 또는 LOCKED 기록은 직원이 수정하거나 삭제할 수 없습니다.');
  }
}

export type MboBundle = {
  title: string;
  keyResults: { name: string; target: number }[];
  comment: string;
};

/** 목표·지표·피드백이 모두 유효할 때만 저장 단위를 반환한다. */
export function commitMboBundle(input: MboBundle): MboBundle {
  if (!input.title.trim()) throw new Error('목표 제목이 필요합니다.');
  if (input.keyResults.length === 0) throw new Error('핵심 지표가 하나 이상 필요합니다.');
  for (const item of input.keyResults) {
    if (!item.name.trim() || item.target < 0) throw new Error('핵심 지표가 불완전합니다.');
  }
  return {
    title: input.title.trim(),
    keyResults: input.keyResults.map((item) => ({ name: item.name.trim(), target: item.target })),
    comment: input.comment.trim(),
  };
}

export function excludeSample<T extends { isSample: boolean }>(rows: T[]): T[] {
  return rows.filter((row) => row.isSample === false);
}
