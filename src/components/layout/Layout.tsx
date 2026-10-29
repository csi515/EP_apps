import React from "react";
import { useLocation } from "react-router-dom";
import { OmniSearchModal } from "@/core/search/components/OmniSearchModal";
import { GlobalNetworkStatusBar } from "@/core/platform/GlobalNetworkStatusBar";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { KeyboardShortcutsModal } from "@/core/platform/KeyboardShortcutsModal";
import { useOptionalOrganization } from "@/core/organizations/OrganizationProvider";
import { shouldUseModuleChrome } from "@/app/industry/resolveModuleIndustry";
import { WORK_LAYOUT_PAD_CLASS } from "@/shared/components/ui/workPageSpacing";
import { cn } from "@/shared/lib/utils";

/** EP_apps 레이아웃 — 글로벌 사이드바 없음. 앱 내부 내비는 WorkAppShell, 계정·조직은 헤더. */
export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const org = useOptionalOrganization();
  const moduleChrome = shouldUseModuleChrome(
    org?.currentOrganization?.industry_type,
    location.pathname
  );

  return (
    <div
      className={
        moduleChrome
          ? "flex min-h-0 flex-1 flex-col overflow-hidden"
          : "flex min-h-0 flex-1 flex-col bg-slate-50"
      }
    >
      <GlobalNetworkStatusBar />
      <div
        className={
          moduleChrome
            ? "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
            : "flex min-h-0 flex-1 flex-col overflow-auto"
        }
        data-work-scroll-root
        data-testid="app-work-main"
      >
        {moduleChrome ? (
          children
        ) : (
          <div className={cn("flex-1", WORK_LAYOUT_PAD_CLASS)}>{children}</div>
        )}
      </div>
      <OmniSearchModal />
      <ConfirmDialog />
      <KeyboardShortcutsModal />
    </div>
  );
};
