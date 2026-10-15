/**
 * 고객 신원 안전 인계(Safe Transfer Customer Identity) 서비스
 * DB: core.issue_customer_transfer_token & core.safe_transfer_customer_identity
 *
 * 특징:
 * 1. 5분 TTL 일회성 보안 토큰 기반 2차 검증
 * 2. 고객 이름 일치성 Fail-Closed 검증
 * 3. ID 오름차순(ORDER BY id ASC FOR UPDATE) 행 잠금으로 Deadlock 원천 차단
 * 4. 전화번호 변경 또는 계정 재가입 시 게스트 레코드(user_id IS NULL) 원자적 병합
 */

import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { getOrganizationId } from '@/services/adapters';

export interface IssueTransferTokenParams {
  organizationId?: string;
  phone: string;
  customerName: string;
  targetCustomerId?: string;
}

export interface IssueTransferTokenResult {
  success: boolean;
  token?: string;
  expiresAt?: string;
  targetPhone?: string;
  error?: string;
}

export interface ExecuteTransferParams {
  token: string;
  organizationId?: string;
  phone: string;
  customerName: string;
}

export interface ExecuteTransferResult {
  success: boolean;
  customerId?: string;
  mergedCount?: number;
  message?: string;
  error?: string;
}

export async function issueCustomerTransferToken(
  params: IssueTransferTokenParams
): Promise<IssueTransferTokenResult> {
  const orgId = params.organizationId || getOrganizationId();
  if (!orgId) {
    return { success: false, error: '사업장 식별자가 필요합니다.' };
  }

  if (!isSupabaseConfigured()) {
    // 데모/오프라인 모드 mock 토큰
    return {
      success: true,
      token: String(Math.floor(100000 + Math.random() * 900000)),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      targetPhone: params.phone,
    };
  }

  try {
    const client = getCoreClient();
    const { data, error } = await client.rpc('issue_customer_transfer_token' as never, {
      p_organization_id: orgId,
      p_phone: params.phone,
      p_customer_name: params.customerName.trim(),
      p_target_customer_id: params.targetCustomerId || null,
    } as never);

    if (error) {
      return { success: false, error: error.message };
    }

    const payload = data as { token: string; expires_at: string; target_phone: string };
    return {
      success: true,
      token: payload.token,
      expiresAt: payload.expires_at,
      targetPhone: payload.target_phone,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '토큰 발급에 실패했습니다.',
    };
  }
}

export async function safeTransferCustomerIdentity(
  params: ExecuteTransferParams
): Promise<ExecuteTransferResult> {
  const orgId = params.organizationId || getOrganizationId();
  if (!orgId) {
    return { success: false, error: '사업장 식별자가 필요합니다.' };
  }

  if (!params.token || params.token.trim().length < 6) {
    return { success: false, error: '유효한 6자리 보안 토큰을 입력해주세요.' };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: true,
      customerId: 'mock-customer-id',
      mergedCount: 1,
      message: '데모 환경에서 계정 인계가 정상 처리되었습니다.',
    };
  }

  try {
    const client = getCoreClient();
    const { data, error } = await client.rpc('safe_transfer_customer_identity' as never, {
      p_token: params.token.trim(),
      p_organization_id: orgId,
      p_phone: params.phone,
      p_customer_name: params.customerName.trim(),
    } as never);

    if (error) {
      const msg = error.message;
      if (msg.includes('TOKEN_EXPIRED')) {
        return { success: false, error: '인증 토큰 유효시간(5분)이 만료되었습니다. 다시 발급받아주세요.' };
      }
      if (msg.includes('NAME_MISMATCH')) {
        return { success: false, error: '고객 성명이 일치하지 않아 신원 인계가 거부되었습니다 (보안).' };
      }
      if (msg.includes('TOKEN_ALREADY_USED')) {
        return { success: false, error: '이미 사용된 인증 토큰입니다.' };
      }
      return { success: false, error: msg || '신원 인계에 실패했습니다.' };
    }

    const payload = data as { success: boolean; customer_id: string; merged_count?: number };
    return {
      success: true,
      customerId: payload.customer_id,
      mergedCount: payload.merged_count,
      message: '회원 계정 및 수강권·출결 데이터가 안전하게 인계되었습니다.',
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '신원 인계 처리 중 오류가 발생했습니다.',
    };
  }
}
