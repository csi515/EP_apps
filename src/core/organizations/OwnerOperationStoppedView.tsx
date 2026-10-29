import React, { useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useOrganization } from './OrganizationProvider';
import { ownerOperationBlockMessage } from '../auth/services/ownerBusinessGate';

/** 로그인 유지. 휴·폐업 사업장의 운영 화면만 막는다 */
export const OwnerOperationStoppedView: React.FC = () => {
  const { signOut } = useAuth();
  const {
    currentOrganization,
    organizations,
    blockedOwnerOrgIds,
    clearOrganization,
  } = useOrganization();
  const [signingOut, setSigningOut] = useState(false);

  const leave = async () => {
    setSigningOut(true);
    try {
      await clearOrganization();
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8 space-y-5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 text-amber-800">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">운영을 열 수 없습니다</h1>
          <p className="text-sm text-slate-600 mt-2">
            {currentOrganization?.name ? `${currentOrganization.name} ` : ''}
            {ownerOperationBlockMessage()} 로그인은 유지됩니다.
          </p>
        </div>

        {organizations.some(
          (m) =>
            (m.role === 'admin' ||
              m.role === 'manager' ||
              m.role === 'staff' ||
              m.role === 'instructor' ||
              (m.role === 'owner' && !blockedOwnerOrgIds.includes(m.organizationId)))
        ) && (
          <button
            type="button"
            onClick={() => void clearOrganization()}
            className="w-full min-h-[44px] rounded-2xl border border-slate-200 font-bold text-slate-700"
          >
            다른 사업장 선택
          </button>
        )}

        <button
          type="button"
          onClick={() => void leave()}
          disabled={signingOut}
          className="w-full min-h-[44px] text-sm font-bold text-slate-500"
        >
          {signingOut ? <Loader2 className="w-4 h-4 animate-spin inline" /> : '로그아웃'}
        </button>
      </div>
    </div>
  );
};
