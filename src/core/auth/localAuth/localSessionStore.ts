import type { Session, User } from '@supabase/supabase-js';

const TOKEN_KEY = 'ep_local_auth_token';

type LocalPublicUser = {
  id: string;
  email: string;
  full_name: string;
};

type AuthListener = (session: Session | null) => void;

const listeners = new Set<AuthListener>();

export function getLocalAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setLocalAuthToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function buildLocalUser(user: LocalPublicUser): User {
  return {
    id: user.id,
    email: user.email,
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: { provider: 'local', providers: ['local'] },
    user_metadata: { full_name: user.full_name },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    identities: [],
    factors: [],
    is_anonymous: false,
  } as User;
}

export function buildLocalSession(
  accessToken: string,
  user: LocalPublicUser,
  expiresIn = 14 * 24 * 60 * 60
): Session {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: accessToken,
    refresh_token: '',
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: now + expiresIn,
    user: buildLocalUser(user),
  } as Session;
}

export function notifyLocalAuthListeners(session: Session | null): void {
  listeners.forEach((listener) => {
    try {
      listener(session);
    } catch {
      /* ignore listener errors */
    }
  });
}

export function subscribeLocalAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
