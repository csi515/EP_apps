import React, { useState, useEffect } from "react";
import { useLogin } from "@refinedev/core";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Warehouse,
  Info,
} from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { isAppsInToss } from "@/core/auth/domain/platformDetector";
import { loginWithToss } from "@/core/auth/services/tossAuthService";
import { mapLoginErrorMessage } from "@/core/auth/utils/mapLoginErrorMessage";
import { appBrand } from "@/core/brand";
import {
  getLoginLandingCopy,
  type LoginLocale,
} from "./loginLandingCopy";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTossLoading, setIsTossLoading] = useState(false);
  const [language, setLanguage] = useState<LoginLocale>('ko');
  const [rememberMe, setRememberMe] = useState(true);
  const copy = getLoginLandingCopy(language);

  useEffect(() => {
    document.documentElement.lang = language === 'ja' ? 'ja' : 'ko';
  }, [language]);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawReturnUrl = searchParams.get("returnUrl");
  const returnUrl =
    rawReturnUrl && rawReturnUrl.startsWith("/") && !rawReturnUrl.startsWith("//")
      ? rawReturnUrl
      : null;
  const { mutate: login, isPending: isLoading } = useLogin();
  const inToss = isAppsInToss();

  const handleTossLogin = async () => {
    setIsTossLoading(true);
    setErrorMessage(null);
    try {
      const result = await loginWithToss();
      if (result.success) {
        if (returnUrl) {
          navigate(returnUrl);
          return;
        }
        navigate("/workspace");
      } else {
        setErrorMessage(
          result.error || "토스 로그인 연동에 실패했습니다. 다시 시도해 주세요."
        );
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "토스 원클릭 로그인 처리 중 오류가 발생했습니다."
      );
    } finally {
      setIsTossLoading(false);
    }
  };

  // 앱스인토스 환경 감지 시: 진입 즉시 토스 원클릭 자동 로그인 프로세스 진행
  useEffect(() => {
    if (isAppsInToss()) {
      void handleTossLogin();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    login(
      { email, password, rememberMe } as any,
      {
        onSuccess: (data: any) => {
          // Refine authProvider는 실패 시에도 resolve({ success: false }) 하므로
          // onError가 아니라 onSuccess에서 success를 반드시 검사한다.
          if (!data?.success) {
            setErrorMessage(mapLoginErrorMessage(data?.error?.message));
            return;
          }
          if (returnUrl) {
            navigate(returnUrl);
            return;
          }
          navigate(data?.redirectTo || "/workspace");
        },
        onError: (error: any) => {
          setErrorMessage(mapLoginErrorMessage(error?.message));
        },
      }
    );
  };

  return (
    <div className="min-h-[100svh] h-dvh w-full flex flex-row bg-slate-50">
      {/* 좌측: 브랜드 패널 (데스크톱 고정) */}
      <div
        data-testid="desktop-brand-panel"
        className="flex w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden"
      >
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
                {appBrand.acronym}
              </span>
              <h2 className="text-xl font-extrabold tracking-tight">{appBrand.shortName}</h2>
            </div>
          </div>

          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>{appBrand.tagline}</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight mb-4">
            {copy.heroTitleLine1}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-200 to-blue-200">
              {copy.heroTitleHighlight}
            </span>
          </h1>
          <p className="text-sm xl:text-base text-slate-400 leading-relaxed max-w-lg">
            {language === 'ko' ? `${appBrand.description}. ` : ''}
            {copy.heroDescription}
          </p>

          <div
            data-testid="extra-login-notice-desktop"
            className="mt-6 flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4"
          >
            <Info className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-amber-100">
                {copy.extraLoginTitle}
              </p>
              <p className="mt-1 text-xs text-amber-100/80 leading-relaxed">
                {copy.extraLoginBody}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4 my-8">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 mb-2.5">
              <FileCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-200 mb-1">
              {copy.featureApprovalTitle}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {copy.featureApprovalBody}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 mb-2.5">
              <Warehouse className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-200 mb-1">
              {copy.featureOpsTitle}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {copy.featureOpsBody}
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{copy.securityRls}</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <span>{copy.securityAccount}</span>
          </div>
        </div>
      </div>

      {/* 우측: 로그인 폼 */}
      <div className="w-1/2 flex items-center justify-center p-8 xl:p-12">
        <div className="w-full max-w-md bg-white rounded-3xl p-10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {inToss ? copy.formTitleToss : copy.formTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-1.5">
              {inToss ? copy.formSubtitleToss : copy.formSubtitle}
            </p>
          </div>

          <LoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onTossLogin={handleTossLogin}
            isTossLoading={isTossLoading}
            language={language}
            onLanguageChange={setLanguage}
            rememberMe={rememberMe}
            onRememberMeChange={setRememberMe}
            returnUrl={returnUrl ?? undefined}
          />
        </div>
      </div>
    </div>
  );
};
