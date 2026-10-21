/**
 * 부서 코드(Dept Code) 기반 작업표준(SOP) 및 위험성평가(Risk Assessment) 자동 채번 & 제·개정 이력(Audit Trail) 엔진
 */

export interface StepHazardBlock {
  id: string;
  stepNumber: number; // 순번 (1, 2, 3...)
  actionTitle: string; // 작업 표준 단계 (동작 및 절차)
  hazardDesc: string; // 유해위험요인
  hazardCategory: string; // 기계적, 전기적, 화학물질, 추락/전도 등
  
  // 초기 위험도
  initialFreq: number; // 1 ~ 5
  initialSev: number; // 1 ~ 5
  initialScore: number; // 1 ~ 25
  initialLevel: 'critical' | 'high' | 'medium' | 'low';

  // 안전 통제 조치 (SOP)
  sopControlMeasure: string; // 핵심 안전조치 및 SOP 통제 기준
  requiredPPE: string[]; // 필수 보호구 배열

  // 개선 후 잔여 위험도
  residualFreq: number;
  residualSev: number;
  residualScore: number;
  residualLevel: 'critical' | 'high' | 'medium' | 'low';

  // 이행 관리
  assignee: string; // 담당자
  actionDeadline: string; // 조치 기한
  isImplemented: boolean;
}

export interface RevisionSnapshot {
  revNumber: number; // 0, 1, 2...
  revLabel: string; // Rev.00, Rev.01...
  revisedDate: string; // 개정 일자 (YYYY-MM-DD)
  revReason: string; // 개정 사유
  authorName: string; // 작성자
  reviewerName: string; // 검토자 (안전관리자)
  approverName: string; // 최종 승인자 (센터장/공장장)
  status: 'draft' | 'pending_approval' | 'approved';
  stepsSnapshot: StepHazardBlock[];
  prohibitedActions: string[];
}

export interface WorkStandardSOPMaster {
  docNo: string; // 예: "SOP-MNT-001"
  deptCode: string; // 예: "MNT"
  deptName: string; // 예: "정비보전팀"
  processName: string; // 예: "차량 리프트 하부 정비 작업"
  currentRev: string; // 예: "Rev.02"
  activeRevNumber: number; // 2
  status: 'draft' | 'pending_approval' | 'approved';
  revisions: RevisionSnapshot[];
}

export interface DepartmentCodeInfo {
  code: string; // "MNT", "PRD1", "RND", "SAF"
  name: string; // "정비보전팀", "생산1팀", "연구소 분석팀", "안전품질팀"
}

export const PRESET_DEPARTMENTS: DepartmentCodeInfo[] = [
  { code: 'MNT', name: '정비보전팀' },
  { code: 'PRD1', name: '생산1팀' },
  { code: 'RND', name: '연구개발소' },
  { code: 'SAF', name: '안전보건팀' },
  { code: 'LOG', name: '물류운영팀' },
  { code: 'QC', name: '품질관리팀' },
];

/**
 * 작업표준서(SOP) 문서 관리번호 자동 채번
 * 포맷: SOP-[부서코드]-[3자리 일련번호] (예: SOP-MNT-001)
 */
export function generateSopDocNo(deptCode: string, sequenceNumber: number): string {
  const cleanCode = (deptCode || 'GEN').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const seqStr = String(Math.max(1, sequenceNumber)).padStart(3, '0');
  return `SOP-${cleanCode}-${seqStr}`;
}

/**
 * 위험성평가(RA) 문서 관리번호 채번
 * 포맷: RA-[부서코드]-[공정번호]-[위험순번] (예: RA-MNT-001-H01)
 */
export function generateHazardDocNo(sopDocNo: string, hazardSeq: number): string {
  const base = sopDocNo.startsWith('SOP-') ? sopDocNo.replace('SOP-', 'RA-') : `RA-${sopDocNo}`;
  const seqStr = String(Math.max(1, hazardSeq)).padStart(2, '0');
  return `${base}-H${seqStr}`;
}

/**
 * 개정 차수 포맷터 (0 -> "Rev.00", 1 -> "Rev.01")
 */
export function formatRevisionNo(revNumber: number): string {
  return `Rev.${String(Math.max(0, revNumber)).padStart(2, '0')}`;
}

/**
 * 문서 번호와 개정 차수 결합 문자열
 * 예: "SOP-MNT-001_Rev.02"
 */
export function formatDocNoWithRevision(docNo: string, revNumber: number): string {
  return `${docNo}_${formatRevisionNo(revNumber)}`;
}

/**
 * 기존 등록된 문서 번호들로부터 특정 부서의 다음 일련번호(Next Sequence Number) 계산
 */
export function getNextSequenceNumber(existingDocNos: readonly string[], deptCode: string): number {
  const prefix = `SOP-${deptCode.trim().toUpperCase()}-`;
  let maxSeq = 0;

  for (const doc of existingDocNos) {
    if (doc.startsWith(prefix)) {
      const rest = doc.substring(prefix.length).split('_')[0]; // "_Rev.00" 제거
      const parsed = parseInt(rest, 10);
      if (!Number.isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  return maxSeq + 1;
}

/**
 * 위험도 계산 (빈도 x 강도)
 */
export function computeRiskScore(freq: number, sev: number): {
  score: number;
  level: 'critical' | 'high' | 'medium' | 'low';
} {
  const f = Math.max(1, Math.min(5, Math.round(freq)));
  const s = Math.max(1, Math.min(5, Math.round(sev)));
  const score = f * s;

  if (score >= 15) return { score, level: 'critical' };
  if (score >= 10) return { score, level: 'high' };
  if (score >= 5) return { score, level: 'medium' };
  return { score, level: 'low' };
}
