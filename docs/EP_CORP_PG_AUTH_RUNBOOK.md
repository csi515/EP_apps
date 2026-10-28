# 사내 PostgreSQL 커스텀 인증 배포 런북

인증·세션·조직·직급·직무 권한은 사내 PostgreSQL **`app` / `core`** 스키마를 사용한다.  
업무 Capability 테이블·PostgREST 컷오버는 [EP_CORP_PG_DOMAIN_RUNBOOK.md](./EP_CORP_PG_DOMAIN_RUNBOOK.md)를 따른다.

## 구성 요약

| 구성 요소 | 위치 |
|-----------|------|
| 스키마 | `app` + `core` (`migrations/domain/001–002` 및 bridge) |
| Auth API (사내) | `npm run auth:serve` |
| Auth API (로컬 Vite) | `/api/local-auth` |
| JWT | 로그인 응답 `access_token` → PostgREST `Authorization` |
| 프론트 | `VITE_LOCAL_AUTH=true`, `VITE_AUTH_API_BASE` |
| 개발 시드 | `npm run seed:dev` (`*@ep.local`) |
| 사내 부트스트랩 | `npm run seed:corp-bootstrap` (owner+조직만, 직급 없음) |

**금지:** 브라우저에서 사내 PG에 직접 접속. Auth API / PostgREST 경유.

## 마이그레이션

```bash
npm run db:migrate:domain
```

인증·테넌트는 `001_app_login` + `002_core_tenant` + `005_auth_bridge`에 포함된다.  
레거시 `ep_auth` / `migrations/local-auth`는 더 이상 사용하지 않는다.

## 사내 부트스트랩

```bash
export EP_LOCAL_AUTH_SEED_MODE=none
export EP_CORP_OWNER_EMAIL='owner@company.example'
export EP_CORP_OWNER_PASSWORD='임시비밀번호'
npm run seed:corp-bootstrap
```

직급은 Zero-Setup(`EpZeroSetupWizard`) UI에서 `core.organization_roles`로 저장한다.

## Auth API 기동

```bash
export EP_LOCAL_AUTH_SEED_MODE=none
export EP_JWT_SECRET='...same as PostgREST...'
npm run auth:serve
```

헬스: `GET /api/local-auth/health`

## 검증

```bash
npm run test:local-auth-roles
npm run test:local-auth-permissions
npm run test:local-auth-staging
```

도메인 포함: `npm run test:domain-smoke` — **Postgres+PostgREST 필수**. PGlite만으로는 도메인 통과로 보지 않는다.  
운영 골격: [EP_OPS_CHECKLIST.md](./EP_OPS_CHECKLIST.md)
