import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGetIdentity, useLogout } from "@refinedev/core";
import {
  LogOut,
  User,
  Bell,
  UserPlus,
  X,
} from "lucide-react";
import { useOrganization } from "@/core/organizations/OrganizationProvider";
import { appBrand } from "@/core/brand";
import { customerJoinService } from "@/core/customer/services/customerJoinService";
import { CustomerJoinRequestsPanel } from "@/core/customer/CustomerJoinRequestsPanel";

export const Header: React.FC = () => {
  const { data: user } = useGetIdentity<{ name?: string; email?: string }>();
  const { mutate: logout } = useLogout();
  const { currentOrganization } = useOrganization();

  const [pendingJoinCount, setPendingJoinCount] = useState<number>(0);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState<boolean>(false);

  const checkPendingRequests = useCallback(async () => {
    if (!currentOrganization?.id) {
      setPendingJoinCount(0);
      return;
    }
    try {
      const requests = await customerJoinService.getOrgJoinRequests(
        currentOrganization.id,
        "pending"
      );
      setPendingJoinCount(requests.length);
    } catch {
      setPendingJoinCount(0);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    void checkPendingRequests();
    const handleFocus = () => void checkPendingRequests();
    window.addEventListener("focus", handleFocus);
    const interval = setInterval(checkPendingRequests, 60000);
    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [checkPendingRequests]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-sm">
              E
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              {appBrand.shortName}
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsJoinModalOpen(true)}
            className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="가입 승인 및 알림"
            aria-label="알림"
          >
            <Bell className="h-5 w-5" />
            {pendingJoinCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-75 duration-150"
                title={`승인 대기 가입 신청 ${pendingJoinCount}건`}
              >
                {pendingJoinCount > 9 ? "9+" : pendingJoinCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden text-sm font-medium text-slate-700 sm:inline-block">
              {user?.name || user?.email || "임직원"}
            </span>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="로그아웃"
              aria-label="로그아웃"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">신규 가입 신청 승인</h2>
                  <p className="text-xs text-slate-500">임직원 초대·가입 신청을 검토하고 승인합니다</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsJoinModalOpen(false);
                  void checkPendingRequests();
                }}
                className="p-2 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <CustomerJoinRequestsPanel
                onUpdated={() => {
                  void checkPendingRequests();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
