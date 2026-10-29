/** 로그인 랜딩(회사 업무 앱 입구) UI 문구 — 한국어 / 일본어 */

export type LoginLocale = 'ko' | 'ja';

export type LoginLandingCopy = {
  heroTitleLine1: string;
  heroTitleHighlight: string;
  heroDescription: string;
  featureApprovalTitle: string;
  featureApprovalBody: string;
  featureOpsTitle: string;
  featureOpsBody: string;
  securityRls: string;
  securityAccount: string;
  extraLoginTitle: string;
  extraLoginBody: string;
  formTitle: string;
  formSubtitle: string;
  formTitleToss: string;
  formSubtitleToss: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  forgotPassword: string;
  rememberMe: string;
  submitLabel: string;
  loggingIn: string;
  tossConnecting: string;
  tossSecureBadge: string;
  tossAutoLoginTitle: string;
  tossLoginButton: string;
  tossLoginOnlyHint: string;
  mobileSubtitle: string;
};

const ko: LoginLandingCopy = {
  heroTitleLine1: '사내에서 만든 업무 앱을',
  heroTitleHighlight: '한곳에서 실행합니다',
  heroDescription:
    '결재, 안전·SOP, 현장 자재, 공용자원을 EP 안에서 바로 이어갑니다.',
  featureApprovalTitle: '전자 결재',
  featureApprovalBody: '기안·승인·반려를 한 흐름으로 처리합니다.',
  featureOpsTitle: '현장 운영',
  featureOpsBody: '안전·SOP, 현장 자재, 공용자원을 한 화면에서 다룹니다.',
  securityRls: 'Row Level Security (RLS) 테넌트 격리',
  securityAccount: '계정 탈취 방어 내장',
  extraLoginTitle: '추가 로그인이 필요합니다',
  extraLoginBody:
    '회사 EP(그룹웨어)에 이미 로그인되어 있어도, 이 업무 앱은 별도 계정입니다. 아래에서 한 번 더 로그인해야 앱을 실행할 수 있습니다.',
  formTitle: '임직원 로그인',
  formSubtitle: '등록된 회사 계정으로 업무 앱에 접속하세요.',
  formTitleToss: '앱스인토스 로그인',
  formSubtitleToss: '토스 앱 계정으로 자동 인증하여 접속합니다.',
  emailLabel: '회사 이메일',
  emailPlaceholder: 'you@company.com',
  passwordLabel: '비밀번호',
  forgotPassword: '비밀번호 찾기',
  rememberMe: '로그인 상태 유지',
  submitLabel: '임직원 로그인',
  loggingIn: '로그인 중...',
  tossConnecting: '토스 계정과 업무 앱을 연결 중입니다.',
  tossSecureBadge: '토스 앱 보안 연동',
  tossAutoLoginTitle: '토스 원클릭 자동 로그인 중',
  tossLoginButton: '토스로 로그인',
  tossLoginOnlyHint: '토스 계정 인증만 제공됩니다.',
  mobileSubtitle: '결재, 안전, 자재, 공용자원을 한곳에서 — EP 내 업무 앱 실행',
};

const ja: LoginLandingCopy = {
  heroTitleLine1: '社内で作った業務アプリを',
  heroTitleHighlight: 'ひとつの場所で実行します',
  heroDescription:
    '承認、安全・SOP、現場資材、共有リソースを EP の中でそのままつなげます。',
  featureApprovalTitle: '電子承認',
  featureApprovalBody: '起案・承認・差戻しをひとつの流れで処理します。',
  featureOpsTitle: '現場運営',
  featureOpsBody: '安全・SOP、現場資材、共有リソースを一つの画面で扱います。',
  securityRls: 'Row Level Security (RLS) テナント分離',
  securityAccount: 'アカウント乗っ取り防御を内蔵',
  extraLoginTitle: '追加ログインが必要です',
  extraLoginBody:
    '会社の EP（グループウェア）にすでにログインしていても、この業務アプリは別アカウントです。下で再度ログインするとアプリを実行できます。',
  formTitle: '社員ログイン',
  formSubtitle: '登録済みの会社アカウントで業務アプリに接続してください。',
  formTitleToss: 'Apps in Toss ログイン',
  formSubtitleToss: 'Toss アプリアカウントで自動認証して接続します。',
  emailLabel: '会社メール',
  emailPlaceholder: 'you@company.com',
  passwordLabel: 'パスワード',
  forgotPassword: 'パスワードを忘れた場合',
  rememberMe: 'ログイン状態を保持',
  submitLabel: '社員ログイン',
  loggingIn: 'ログイン中...',
  tossConnecting: 'Toss アカウントと業務アプリを接続しています。',
  tossSecureBadge: 'Toss アプリのセキュリティ連携',
  tossAutoLoginTitle: 'Toss ワンクリック自動ログイン中',
  tossLoginButton: 'Toss でログイン',
  tossLoginOnlyHint: 'Toss アカウント認証のみ提供します。',
  mobileSubtitle: '承認・安全・資材・共有リソースを一箇所で — EP 内の業務アプリ実行',
};

/** @deprecated 한국어 기본 카피 — getLoginLandingCopy 사용 권장 */
export const loginLandingCopy = ko;

export function getLoginLandingCopy(locale: LoginLocale = 'ko'): LoginLandingCopy {
  return locale === 'ja' ? ja : ko;
}
