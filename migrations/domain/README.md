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
| 022–029 | admin login_id, MBO dept/dates/memo/cells, grievance author, bulk dept reassign |
| 030–031 | training_ack 테이블·초기 RLS(030), can_manage + RLS 강화 + acknowledge/replace RPC(031) |
| 032–034 | supply_restock manage RLS(032), resources can_manage+예약 RPC SoT(033), research read/write/gate RLS(034) |
| 035–036 | sop safety:manage 위임(035), mbo goals:write 쓰기 RLS(036) |
| 037 | SOP·위험성평가 자식 RLS + WORM + 결재/개정/재서약 RPC |
| 038 | 유해화학 MSDS `hazardous_substances`·`chemical_usage_logs` + safety:manage RLS (앱 플래그 미전환) |

032+ 적용 후 PostgREST 스키마 캐시 리로드: `NOTIFY pgrst, 'reload schema';` (또는 postgrest 재시작).
로컬 테이블 소유자가 `postgres`이면 `postgresql://postgres:…` 로 적용한다.

검증: `npm run check:migration-syntax`
