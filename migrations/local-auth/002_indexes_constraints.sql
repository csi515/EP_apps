-- ep_auth: 인덱스·제약 (002)
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_uidx
  ON ep_auth.app_users (LOWER(email));

CREATE INDEX IF NOT EXISTS app_sessions_user_id_idx
  ON ep_auth.app_sessions (user_id);

CREATE INDEX IF NOT EXISTS app_sessions_expires_at_idx
  ON ep_auth.app_sessions (expires_at);

CREATE INDEX IF NOT EXISTS organization_members_user_id_idx
  ON ep_auth.organization_members (user_id);

CREATE INDEX IF NOT EXISTS organization_roles_org_rank_idx
  ON ep_auth.organization_roles (organization_id, rank_order);
