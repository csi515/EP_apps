import { createHmac, timingSafeEqual } from 'node:crypto';
import type { LeadSource } from '@/capabilities/trial_funnel/domain/trialFunnelEngine';

export interface WebhookHeaderVerificationInput {
  signatureHeader: string | null | undefined;
  timestampHeader: string | null | undefined;
  rawPayload: string;
  webhookSecret: string;
  toleranceSeconds?: number;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
}

export interface IngestLeadPayload {
  organization_id: string;
  customer_name: string;
  phone: string;
  source?: LeadSource;
  target_program?: string;
  notes?: string;
}

export interface MesProductionPayload {
  organization_id: string;
  task_order_id: string; // core.task_orders의 id
  completed_quantity: number;
  defect_quantity?: number;
  operator_id?: string;
  machine_id?: string;
  timestamp?: string;
}

/**
 * HMAC-SHA256 기반 외부 웹훅 서명 및 타임스탬프 유효성 검증
 * - Replay Attack 방지: timestamp가 허용 오차(기본 300초 = 5분)를 초과하면 거부
 * - Timing-safe 비교로 타이밍 공격 방지
 */
export function verifyWebhookSignature({
  signatureHeader,
  timestampHeader,
  rawPayload,
  webhookSecret,
  toleranceSeconds = 300,
}: WebhookHeaderVerificationInput): WebhookVerificationResult {
  if (!signatureHeader) {
    return { isValid: false, error: 'MISSING_SIGNATURE: X-Moa-Signature header is missing' };
  }
  if (!timestampHeader) {
    return { isValid: false, error: 'MISSING_TIMESTAMP: X-Moa-Timestamp header is missing' };
  }

  const timestampNum = parseInt(timestampHeader, 10);
  if (isNaN(timestampNum)) {
    return { isValid: false, error: 'INVALID_TIMESTAMP: Timestamp must be integer epoch seconds' };
  }

  const currentEpoch = Math.floor(Date.now() / 1000);
  if (Math.abs(currentEpoch - timestampNum) > toleranceSeconds) {
    return { isValid: false, error: 'TIMESTAMP_OUT_OF_BOUNDS: Webhook timestamp has expired or is in the future' };
  }

  // 서명 계산 대상: `${timestamp}.${rawPayload}`
  const signedData = `${timestampHeader}.${rawPayload}`;
  const hmac = createHmac('sha256', webhookSecret);
  hmac.update(signedData);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  try {
    const signatureBuffer = Buffer.from(signatureHeader, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return { isValid: false, error: 'INVALID_SIGNATURE: Signature length mismatch' };
    }

    const matches = timingSafeEqual(signatureBuffer, expectedBuffer);
    if (!matches) {
      return { isValid: false, error: 'INVALID_SIGNATURE: Signature verification failed' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'SIGNATURE_VERIFICATION_ERROR' };
  }
}

/**
 * 웹 마케팅 폼에서 인입된 신규 리드 웹훅 페이로드 파싱 및 정규화
 */
export function parseAndNormalizeLeadWebhook(payload: unknown): IngestLeadPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('INVALID_PAYLOAD: Payload must be a non-null object');
  }

  const data = payload as Record<string, any>;

  if (!data.organization_id || typeof data.organization_id !== 'string') {
    throw new Error('VALIDATION_ERROR: organization_id is required');
  }
  if (!data.customer_name || typeof data.customer_name !== 'string') {
    throw new Error('VALIDATION_ERROR: customer_name is required');
  }
  if (!data.phone || typeof data.phone !== 'string') {
    throw new Error('VALIDATION_ERROR: phone is required');
  }

  const allowedSources: LeadSource[] = ['instagram', 'naver', 'referral', 'walk_in', 'flyer', 'other'];
  const source: LeadSource = allowedSources.includes(data.source) ? data.source : 'other';

  return {
    organization_id: data.organization_id,
    customer_name: data.customer_name.trim(),
    phone: data.phone.trim(),
    source,
    target_program: data.target_program ? String(data.target_program).trim() : '온라인 유입 문의',
    notes: data.notes ? String(data.notes).trim() : '외부 웹훅 마케팅 폼을 통해 자동 접수됨',
  };
}

/**
 * 공장 MES 설비 실적 웹훅 페이로드 파싱 및 정규화
 */
export function parseAndNormalizeMesWebhook(payload: unknown): MesProductionPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('INVALID_PAYLOAD: Payload must be a non-null object');
  }

  const data = payload as Record<string, any>;

  if (!data.organization_id || typeof data.organization_id !== 'string') {
    throw new Error('VALIDATION_ERROR: organization_id is required');
  }
  if (!data.task_order_id || typeof data.task_order_id !== 'string') {
    throw new Error('VALIDATION_ERROR: task_order_id is required');
  }
  const qty = Number(data.completed_quantity);
  if (isNaN(qty) || qty < 0) {
    throw new Error('VALIDATION_ERROR: completed_quantity must be a non-negative number');
  }

  return {
    organization_id: data.organization_id,
    task_order_id: data.task_order_id,
    completed_quantity: qty,
    defect_quantity: Number(data.defect_quantity) || 0,
    operator_id: data.operator_id ? String(data.operator_id) : undefined,
    machine_id: data.machine_id ? String(data.machine_id) : undefined,
    timestamp: data.timestamp ? String(data.timestamp) : new Date().toISOString(),
  };
}
