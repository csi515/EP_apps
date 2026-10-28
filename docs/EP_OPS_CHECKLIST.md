# EP_apps 운영 체크리스트 (최소 골격)

사내 배포 전·후 확인용. APM·SSO 제품 도입은 후속 범위입니다.

## 필수 인프라

- [ ] PostgreSQL (corp) — Auth(`app`) + Domain(`core`) 동일 인스턴스
- [ ] PostgREST — JWT secret = Auth API `EP_JWT_SECRET`
- [ ] Auth API (`npm run auth:serve` 또는 동등 프로세스)
- [ ] 프론트: `VITE_LOCAL_AUTH=true`, `VITE_CORP_DOMAIN=true`, `VITE_SUPABASE_URL=<PostgREST>`

**금지:** PGlite만으로 “도메인 SoT 통과” 보고. 검증은 `npm run test:domain-smoke`(PostgREST 필수).

## 시크릿·설정 스토어

| 항목 | 보관 |
|------|------|
| `EP_JWT_SECRET` | 시크릿 스토어 (Auth·PostgREST 동일 값) |
| `DATABASE_URL` / `EP_LOCAL_AUTH_DATABASE_URL` | 시크릿 스토어 (`sslmode=require`) |
| owner 부트스트랩 비밀번호 | 1회성·즉시 교체 (`EP_LOCAL_AUTH_SEED_MODE=none`) |

## 로그 위치 (로컬/사내)

| 구성 | 확인 |
|------|------|
| Auth API | 프로세스 stdout / 컨테이너 로그 |
| PostgREST | Docker `ep-apps-postgrest` 로그 |
| Postgres | Docker `postgres` 로그 · slow query 설정은 후속 |
| 프론트 | 브라우저·배포 플랫폼 액세스 로그 |

## 백업

1. **앱 UI:** 조직 설정 → `OrganizationBackupCard` (테넌트 스냅샷 내보내기)
2. **DB:** DOMAIN 런북의 `pg_dump` 절차 — [EP_CORP_PG_DOMAIN_RUNBOOK.md](./EP_CORP_PG_DOMAIN_RUNBOOK.md#백업)

복원 리허설·RPO/RTO 수치는 후속 DR 문서에서 확정합니다.

## SSO / APM (후속)

- [ ] SSO IdP 연동 후보 선정 (본 체크리스트만 유지)
- [ ] APM/메트릭 제품 선정 및 Auth·PostgREST 헬스 엔드포인트 연동

## 배포 전 스모크

```bash
npm run test:local-auth-staging   # Auth
npm run test:domain-smoke         # PostgREST + 결재/MBO/재고
npm run test:e2e                  # 파일럿 UI 여정
```
