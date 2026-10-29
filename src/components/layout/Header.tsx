import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useGetIdentity, useLogout } from "@refinedev/core";
import {
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";
import { appBrand } from "@/core/brand";

export const Header: React.FC = () => {
  const { data: user } = useGetIdentity<{ name?: string; email?: string }>();
  const { mutate: logout } = useLogout();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const displayName = user?.name || user?.email || "임직원";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-sm">
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

      <div className="relative border-l border-slate-200 pl-3">
        <button
          type="button"
          onClick={() => setIsAccountMenuOpen((open) => !open)}
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px]"
          aria-expanded={isAccountMenuOpen}
          aria-haspopup="menu"
          aria-label="계정 메뉴"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <User className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">{displayName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        </button>

        {isAccountMenuOpen ? (
          <div
            role="menu"
            className="absolute right-0 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-40"
          >
            <Link
              to="/workspace/account"
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[44px]"
              onClick={() => setIsAccountMenuOpen(false)}
            >
              <User className="h-4 w-4 text-slate-400" />
              내 계정
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsAccountMenuOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 min-h-[44px]"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default Header;
