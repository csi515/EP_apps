/**
 * 사내 익명 고충 상담 및 윤리 제보함 도메인 엔진 (Pure Functions)
 */

export type GrievanceCategory =
  | 'WORKPLACE_HARASSMENT'
  | 'SEXUAL_HARASSMENT'
  | 'FRAUD_EMBEZZLEMENT'
  | 'SAFETY_VIOLATION'
  | 'GENERAL_GRIEVANCE';

export type GrievanceStatus = 'SUBMITTED' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'DISMISSED';

export interface AnonymousGrievanceRecord {
  id: string;
  tenant_id: string;
  ticket_code: string; // 예: "G-8814"
  access_pin_hash: string; // 제보자가 사후 조회를 위해 설정한 4~8자리 비밀 PIN 해시
  category: GrievanceCategory;
  subject_title: string;
  incident_content: string;
  evidence_attached: boolean;
  status: GrievanceStatus;
  investigation_feedback?: string; // 처리 결과 회신 문구
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

export function validateGrievanceSubmission(
  title: string,
  content: string,
  pin: string
): { isValid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: '제보 제목을 입력해 주세요.' };
  }
  if (!content || content.trim().length < 10) {
    return { isValid: false, error: '사실 확인을 위해 제보 내용을 최소 10자 이상 상세히 기재해 주세요.' };
  }
  if (!pin || pin.trim().length < 4) {
    return { isValid: false, error: '사후 진행 상황 조회를 위한 비밀 PIN 번호(최소 4자리)를 설정해 주세요.' };
  }
  return { isValid: true };
}
