/**
 * 사내 고충·노경 건의 도메인 엔진 (기명 / 익명)
 */

export type GrievanceCategory =
  | 'WORKPLACE_HARASSMENT'
  | 'SEXUAL_HARASSMENT'
  | 'FRAUD_EMBEZZLEMENT'
  | 'SAFETY_VIOLATION'
  | 'GENERAL_GRIEVANCE';

export type GrievanceStatus = 'SUBMITTED' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'DISMISSED';

export type GrievanceVisibility = 'named' | 'anonymous';

export interface AnonymousGrievanceRecord {
  id: string;
  organization_id?: string;
  tenant_id?: string;
  author_user_id?: string | null;
  visibility?: GrievanceVisibility;
  ticket_code: string;
  access_pin_hash?: string | null;
  category: GrievanceCategory;
  subject_title: string;
  incident_content: string;
  evidence_attached: boolean;
  status: GrievanceStatus;
  investigation_feedback?: string;
  submitted_at: string;
  resolved_at?: string;
}

export function generateTicketCode(seq: number): string {
  return `G-${String(seq).padStart(4, '0')}`;
}

export function hashAccessPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase();
}

export function verifyAccessPin(rawPin: string, storedHash: string): boolean {
  return hashAccessPin(rawPin) === storedHash;
}

/** 기명 건의: PIN 불필요. 익명: PIN 필수. */
export function validateGrievanceSubmission(
  title: string,
  content: string,
  pin: string,
  visibility: GrievanceVisibility = 'anonymous'
): { isValid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: '제보 제목을 입력해 주세요.' };
  }
  if (!content || content.trim().length < 10) {
    return { isValid: false, error: '사실 확인을 위해 제보 내용을 최소 10자 이상 상세히 기재해 주세요.' };
  }
  if (visibility === 'anonymous' && (!pin || pin.trim().length < 4)) {
    return { isValid: false, error: '사후 진행 상황 조회를 위한 비밀 PIN 번호(최소 4자리)를 설정해 주세요.' };
  }
  return { isValid: true };
}

/** SELECT 가시성: 담당자/사업주 전체, 기명은 본인만, 익명은 PIN으로 본인 확인(목록은 RLS가 담당자만). */
export function canViewGrievanceContent(params: {
  record: Pick<AnonymousGrievanceRecord, 'author_user_id' | 'visibility'>;
  viewerUserId: string | null;
  canManageAll: boolean;
}): boolean {
  if (params.canManageAll) return true;
  if (params.record.visibility === 'named' && params.record.author_user_id && params.viewerUserId) {
    return params.record.author_user_id === params.viewerUserId;
  }
  return false;
}
