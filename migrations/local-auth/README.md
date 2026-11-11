# Deprecated — unused (`ep_auth`)

과거 `ep_auth` 스키마용입니다. 현재 npm 스크립트(`db:migrate:local-auth`)는 **domain 마이그레이션**을 적용합니다.

새 인증/테넌트 DDL은 `migrations/domain` (특히 `001_app_login.sql`, `002_core_tenant.sql`, `005_auth_bridge.sql`)에 두세요.
