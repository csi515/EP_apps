import {
  getSessionItem,
  removeSessionItem,
  setSessionItem,
} from '@/core/platform/sessionStorageSafe';

const OAUTH_INTENT_KEY = 'ep_oauth_signup_intent';
const LEGACY_OAUTH_INTENT_KEY = 'moa_oauth_signup_intent';

export type OAuthSignupIntent = {
  mode: 'login' | 'signup';
  fullName?: string;
};

function readIntentRaw(): string | null {
  const current = getSessionItem(OAUTH_INTENT_KEY);
  if (current != null) return current;
  const legacy = getSessionItem(LEGACY_OAUTH_INTENT_KEY);
  if (legacy != null) {
    setSessionItem(OAUTH_INTENT_KEY, legacy);
    removeSessionItem(LEGACY_OAUTH_INTENT_KEY);
    return legacy;
  }
  return null;
}

/** OAuth 리다이렉트 전 가입 의도 저장 */
export function saveOAuthSignupIntent(intent: OAuthSignupIntent): void {
  setSessionItem(OAUTH_INTENT_KEY, JSON.stringify(intent));
  removeSessionItem(LEGACY_OAUTH_INTENT_KEY);
}

export function peekOAuthSignupIntent(): OAuthSignupIntent | null {
  const raw = readIntentRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OAuthSignupIntent;
  } catch {
    return null;
  }
}

export function clearOAuthSignupIntent(): void {
  removeSessionItem(OAUTH_INTENT_KEY);
  removeSessionItem(LEGACY_OAUTH_INTENT_KEY);
}

export function consumeOAuthSignupIntent(): OAuthSignupIntent | null {
  const intent = peekOAuthSignupIntent();
  clearOAuthSignupIntent();
  return intent;
}
