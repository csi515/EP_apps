# Domain migrations (SoT)

사내/로컬 PostgreSQL의 **유일한** 스키마·RPC 적용 경로입니다.

```bash
npm run db:migrate:domain:strict   # 운영·검증 (권장)
npm run db:migrate:domain          # soft skip (임베디드/개발 폴백)
```

- 추적 테이블: `app.schema_migrations` (version = 파일명에서 `.sql` 제거)
- 스키마: `app` (인증·세션), `core` (테넌트·업무)
- 적용기: `server/local-auth/domainMigrate.ts`

`db/postgres/` 및 `migrations/local-auth/`는 **레거시**입니다. 새 DDL/RPC는 이 디렉터리에만 추가하세요.

| 구간 | 내용 |
|------|------|
| 001–005 | app 로그인, core 테넌트, EP 테이블, RLS, auth bridge |
| 006–013 | inventory, 도메인 RPC 골격, MBO, shuttle, meal closed days |
| 014–018 | research links, approval atomic, grievance, volunteer capacity, shuttle multi-route |
| 019–021 | meal response/overview, office supply campaign, volunteer checkin + project categories |

검증: `npm run check:migration-syntax`
