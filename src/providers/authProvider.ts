import type { AuthProvider } from "@refinedev/core";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { StorageService } from "@/services/storage";
import * as authService from "@/core/auth/services/authService";
import * as tossAuthService from "@/core/auth/services/tossAuthService";
import * as orgService from "@/core/organizations/services/organizationService";
import { requestSignOut } from "@/core/auth/services/signOutCoordinator";
import { isLocalAuthEnabled } from "@/core/auth/localAuth/isLocalAuth";

export const authProvider: AuthProvider = {
  login: async ({ email, password, provider, rememberMe }: any) => {
    if (!isLocalAuthEnabled() && !isSupabaseConfigured() && !supabase) {
      return {
        success: false,
        error: {
          name: "Auth Error",
          message: "인증 백엔드가 설정되지 않았습니다.",
        },
      };
    }

    try {
      if (provider) {
        if (provider === "toss") {
          const result = await tossAuthService.loginWithToss();
          if (!result.success) {
            return {
              success: false,
              error: {
                name: "Toss Login Error",
                message: result.error || "토스 로그인 처리에 실패했습니다.",
              },
            };
          }
          // EP_apps: 고객/수강생 포털 없음 — 로그인 후 워크스페이스로 진입
          return {
            success: true,
            redirectTo: "/workspace",
          };
        }
        if (provider === "google") {
          await authService.signInWithGoogle();
          return { success: true };
        }
        if (provider === "apple") {
          await authService.signInWithApple();
          return { success: true };
        }
        if (provider === "kakao") {
          await authService.signInWithKakao();
          return { success: true };
        }
        if (provider === "naver") {
          await authService.signInWithNaver();
          return { success: true };
        }

        const { error } = await supabase.auth.signInWithOAuth({
          provider: provider as any,
        });
        if (error) {
          return {
            success: false,
            error: {
              name: "OAuth Error",
              message: error.message,
            },
          };
        }
        return {
          success: true,
          redirectTo: "/",
        };
      }

      if (email && password) {
        const session = await authService.signIn({ email, password, rememberMe });
        if (!session) {
          return {
            success: false,
            error: {
              name: "Login Error",
              message: "로그인 세션을 생성하지 못했습니다.",
            },
          };
        }

        return {
          success: true,
          redirectTo: "/",
        };
      }

      return {
        success: false,
        error: {
          name: "Login Error",
          message: "이메일/비밀번호 혹은 소셜 로그인 제공자가 필요합니다.",
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: "Login Error",
          message: error?.message || "로그인 처리에 실패했습니다.",
        },
      };
    }
  },

  logout: async (params?: any) => {
    try {
      const result = await requestSignOut({ force: params?.force });
      if (result === 'signed_out') {
        return {
          success: true,
          redirectTo: "/login",
        };
      }

      // 실제 pending offline mutation이 존재하여 확인 팝업이 표시된 상태
      return {
        success: false,
        error: {
          name: "SignOutBlockedError",
          message: "저장되지 않은 오프라인 변경사항이 있어 로그아웃이 보류되었습니다.",
        },
      };
    } catch (err: any) {
      console.warn("[authProvider] logout error:", err?.message || err);
      return {
        success: false,
        error: {
          name: "SignOutError",
          message: err?.message || "로그아웃 처리에 실패했습니다.",
        },
      };
    }
  },

  check: async () => {
    try {
      const session = await authService.getSession();
      if (!session) {
        return {
          authenticated: false,
          redirectTo: "/login",
          logout: true,
        };
      }

      return {
        authenticated: true,
      };
    } catch {
      return {
        authenticated: false,
        redirectTo: "/login",
        logout: true,
      };
    }
  },

  getPermissions: async () => {
    // MOA의 진실 원천: activeUser context (조직 선택 및 멤버십 기반)
    const activeUser = StorageService.getActiveUser();
    if (activeUser?.role) {
      return activeUser.role;
    }

    try {
      const session = await authService.getSession();
      if (session?.user) {
        return (session.user.app_metadata?.role as string) || "authenticated";
      }
    } catch {
      return null;
    }

    return null;
  },

  getIdentity: async () => {
    try {
      const session = await authService.getSession();
      const user = session?.user;
      if (!user) return null;

      const activeUser = StorageService.getActiveUser();
      const storedOrgId = orgService.getStoredOrganizationId();

      return {
        id: user.id,
        name: activeUser?.name || user.user_metadata?.full_name || user.email || "사용자",
        email: user.email || activeUser?.email || "",
        avatar: user.user_metadata?.avatar_url,
        role: activeUser?.role || (user.app_metadata?.role as string) || "authenticated",
        organizationId: storedOrgId || undefined,
        staffId: activeUser?.staffId || undefined,
        parentCustomerId: activeUser?.parentCustomerId || undefined,
      };
    } catch {
      return null;
    }
  },

  onError: async (error) => {
    const message = String(error?.message ?? '');
    const sessionExpired = error?.status === 401 || (/jwt/i.test(message) && /expired/i.test(message));
    if (sessionExpired) {
      const { openReAuthModal } = await import('./authInterceptor');
      openReAuthModal();
      return { error };
    }
    if (error?.status === 403) {
      return {
        logout: true,
        redirectTo: "/login",
        error,
      };
    }
    return { error };
  },
};
