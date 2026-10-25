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

/**
 * 단방향 암호화 블라인드 토큰 생성
 * DB 상에서 작성자 User ID를 완전히 격리(Nullify)하고, 작성자 본인만 고유 영수증 토큰으로 조회 가능하도록 보증합니다.
 */
export function generateBlindReceiptToken(ticketCode: string, pin: string, salt = 'ep_whistleblower_salt'): string {
  const combined = `${ticketCode}:${pin.trim()}:${salt}`;
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 33) ^ char;
  }
  const hex1 = Math.abs(hash1).toString(16).padStart(8, '0').toUpperCase().slice(0, 4);
  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0').toUpperCase().slice(0, 4);
  const hex3 = hashAccessPin(pin + ticketCode).padStart(8, '0').slice(0, 4);
  return `TKN-${hex1}-${hex2}-${hex3}`;
}

/**
 * 익명 건의 제출 데이터 정제 (Strict Zero-Knowledge Sanitization)
 * 익명 건의일 경우 작성자 식별자(author_user_id)를 DB에 도달하기 전 완벽히 제거합니다.
 */
export function sanitizeGrievanceSubmission<T extends { visibility?: GrievanceVisibility; author_user_id?: string | null }>(
  payload: T
): T {
  if (payload.visibility === 'anonymous') {
    return {
      ...payload,
      author_user_id: null,
    };
  }
  return payload;
}

/**
 * 감사 로그 및 담당자 열람 시 제보자 표시 이름 마스킹
 */
export function getMaskedGrievanceAuthor(record: Pick<AnonymousGrievanceRecord, 'visibility' | 'author_user_id'>): string {
  if (record.visibility === 'anonymous') {
    return '익명 제보자 (식별정보 DB 격리)';
  }
  return record.author_user_id ? `임직원 (${record.author_user_id.slice(0, 8)}...)` : '기명 제보자';
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
