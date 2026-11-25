import React, { useCallback, useEffect, useState } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { WorkerRepledgeModal } from './WorkerRepledgeModal';
import { listPendingRepledges } from '../services/riskAssessmentApprovalService';
import { canActivateDailyWorkTicket } from '../domain/approvalEngine';
import { SOP_RISK_UI_COPY } from '../ui/sopRiskUiCopy';

type Identity = { id?: string };

type Pending = {
  id: string;
  assessment_id: string;
  required_version: number;
};

/**
 * 현장 작업자 로그인 시 개정 작업표준 재서약 팝업을 자동 호출.
 * 미서약 시 당일 작업 출결/티켓 활성화를 Fail-Closed로 차단한다.
 */
export const WorkerRepledgeHost: React.FC = () => {
  const { data: identity } = useGetIdentity<Identity>();
  const userId = identity?.id ?? '';
  const [pending, setPending] = useState<Pending | null>(null);
  const [gateBlocked, setGateBlocked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      const rows = (await listPendingRepledges(userId)) as Pending[];
      const first = rows[0] ?? null;
      setPending(first);
      setLoadError(null);
      setGateBlocked(
        !canActivateDailyWorkTicket({
          hasPendingRepledge: Boolean(first),
          repledgeCompletedToday: false,
        }),
      );
    } catch (cause) {
      // Fail-closed: 조회 실패 시에도 작업 티켓을 열지 않는다.
      setPending(null);
      setGateBlocked(true);
      setLoadError(cause instanceof Error ? cause.message : '재서약 상태를 확인하지 못했습니다.');
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <>
      {gateBlocked ? (
        <div className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900">
          {loadError
            ? `${SOP_RISK_UI_COPY.repledgeLoadFailedPrefix} (${loadError})`
            : SOP_RISK_UI_COPY.repledgeGateBlocked}
        </div>
      ) : null}
      <WorkerRepledgeModal
        pending={pending}
        onCompleted={() => {
          setPending(null);
          setGateBlocked(false);
          setLoadError(null);
          void reload();
        }}
      />
    </>
  );
};
