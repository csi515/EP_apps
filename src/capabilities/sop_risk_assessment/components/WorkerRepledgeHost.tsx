import React, { useCallback, useEffect, useState } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { WorkerRepledgeModal } from './WorkerRepledgeModal';
import { listPendingRepledges } from '../services/riskAssessmentApprovalService';
import { canActivateDailyWorkTicket } from '../domain/approvalEngine';

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

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      const rows = (await listPendingRepledges(userId)) as Pending[];
      const first = rows[0] ?? null;
      setPending(first);
      setGateBlocked(
        !canActivateDailyWorkTicket({
          hasPendingRepledge: Boolean(first),
          repledgeCompletedToday: false,
        }),
      );
    } catch {
      setPending(null);
      setGateBlocked(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <>
      {gateBlocked ? (
        <div className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900">
          개정된 작업표준 재서약이 완료되기 전까지 당일 작업 출결/티켓이 활성화되지 않습니다.
        </div>
      ) : null}
      <WorkerRepledgeModal
        pending={pending}
        onCompleted={() => {
          setPending(null);
          setGateBlocked(false);
          void reload();
        }}
      />
    </>
  );
};
