import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  Globe,
  Loader2,
} from "lucide-react";
import { isAppsInToss } from "@/core/auth/domain/platformDetector";
import {
  getLoginLandingCopy,
  type LoginLocale,
} from "@/pages/auth/loginLandingCopy";

export interface LoginFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  errorMessage?: string | null;
  onTossLogin?: () => void;
  isTossLoading?: boolean;
  language?: LoginLocale;
  onLanguageChange?: (lang: LoginLocale) => void;
  rememberMe?: boolean;
  onRememberMeChange?: (remember: boolean) => void;
  returnUrl?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  isLoading,
  errorMessage,
  onTossLogin,
  isTossLoading = false,
  language = 'ko',
  onLanguageChange,
  rememberMe: externalRememberMe,
  onRememberMeChange,
  returnUrl,
}) => {
  const navigate = useNavigate();
  const [internalRememberMe, setInternalRememberMe] = useState(true);
  const copy = getLoginLandingCopy(language);

  const isRemember = externalRememberMe ?? internalRememberMe;
  const setRemember = onRememberMeChange ?? setInternalRememberMe;

  const inToss = isAppsInToss();
  const isJa = language === 'ja';

  const forgotPath = returnUrl
    ? `/signup?mode=forgot&returnUrl=${encodeURIComponent(returnUrl)}`
    : "/signup?mode=forgot";

  if (inToss) {
    return (
      <div data-testid="login-container" className="w-full space-y-6">
        <div className="flex items-center justify-center space-x-2 py-1 px-3 bg-blue-50 border border-blue-100 rounded-full mx-auto w-fit">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[11px] font-semibold text-blue-700">{copy.tossSecureBadge}</span>
        </div>

        {isTossLoading || isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <RefreshCw className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {copy.tossAutoLoginTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {copy.tossConnecting}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium animate-in fade-in">
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={onTossLogin}
              disabled={isLoading || isTossLoading}
              className="w-full h-12 flex items-center justify-center space-x-2 rounded-xl bg-[#0064FF] hover:bg-[#0052D4] active:bg-[#0040A8] text-white text-sm font-semibold transition-all shadow-md shadow-blue-100 disabled:opacity-50"
            >
              <span>{copy.tossLoginButton}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <p className="text-center text-xs text-slate-400 leading-normal">
              {copy.tossLoginOnlyHint}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="login-container" className="w-full space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            {copy.emailLabel}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="login-email"
              data-testid="input-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.emailPlaceholder}
              className="w-full min-h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all bg-slate-50/50 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-slate-700"
            >
              {copy.passwordLabel}
            </label>
            <Link
              to="/signup?mode=forgot"
              onClick={(e) => {
                if (returnUrl) {
                  e.preventDefault();
                  navigate(forgotPath);
                }
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 min-h-[32px] inline-flex items-center font-medium"
              data-testid="link-forgot-password"
            >
              {copy.forgotPassword}
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="login-password"
              data-testid="input-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full min-h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all bg-slate-50/50 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center py-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isRemember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-600 font-medium">{copy.rememberMe}</span>
          </label>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium animate-in fade-in">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          data-testid="btn-email-submit"
          disabled={isLoading}
          className="w-full mt-2 h-11 min-h-[44px] flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-md disabled:opacity-50 transition-all active:scale-[0.99] cursor-pointer bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-500"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{copy.loggingIn}</span>
            </>
          ) : (
            <span>{copy.submitLabel}</span>
          )}
        </button>
      </form>

      {onLanguageChange ? (
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <div
            className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 shrink-0"
            data-testid="login-locale-switch"
            role="group"
            aria-label="Language"
          >
            <Globe className="w-3.5 h-3.5 ml-1.5 text-slate-400" />
            <button
              type="button"
              onClick={() => onLanguageChange('ko')}
              className={`px-2 py-1 rounded-md transition-all ${
                !isJa ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              KO
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('ja')}
              className={`px-2 py-1 rounded-md transition-all ${
                isJa ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              JA
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
