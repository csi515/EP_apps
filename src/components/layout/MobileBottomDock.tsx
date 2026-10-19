import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, ScanLine, Wallet, Menu } from 'lucide-react';

const TABS = [
  { href: '/dashboard', label: '홈', icon: Home },
  { href: '/booking/week', label: '시간표', icon: Calendar },
  { href: '/kiosk/attendance', label: '출결', icon: ScanLine },
  { href: '/billing', label: '장부', icon: Wallet },
  { href: '/workspace/settings', label: '더보기', icon: Menu },
];

export function MobileBottomDock() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 hidden h-16 border-t bg-white pb-[env(safe-area-inset-bottom)] max-lg:flex">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink key={tab.href} to={tab.href} className="flex min-h-12 flex-1 flex-col items-center justify-center text-[11px] font-bold">
            <Icon className="h-5 w-5" />
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
