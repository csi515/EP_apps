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
npm run db:migrate:domain         # 038 포함 (소유권 이슈 시 postgres URL)
npm run test:sop-risk-lifecycle-pg # SOP 초안→승인→개정→재서약 (PG 직접, PostgREST 불필요)
npm run test:domain-smoke         # PostgREST + 결재/MBO/재고/SOP수명주기
npx playwright test tests/e2e/sop-risk-smoke.spec.ts  # SOP 초안 UI (스택 healthy 시)
npm run test:e2e                  # 파일럿 UI 여정
```

## 숨김 Capability 정책 (`personal_plant_ops`)

프리셋 `capabilities[]`에 포함되지만, 초기 `defaultSettings.hidden_capabilities`로 **런처·사이드바에서 기본 비표시**하는 선택 기능입니다. 조직이 명시적으로 켜기 전까지 단순해진 홈 화면을 유지합니다.

| Capability | 숨김 이유 | 활성화 방법 |
|------------|-----------|-------------|
| `recipe_bom` | 레시피/BOM은 소규모 현장 기본 런처 대상 아님 | 설정 → 메뉴 표시 관리에서 표시 / `hidden_capabilities`에서 제거 |
| `rental_equipment` | 장비 대여는 선택 업무(공용자원·예약 중심 배포) | 동일 |
| `safety_consent` | 안전 서약은 SOP·교육 흐름에 묶인 선택 모듈 | 동일 |
| `facility_incident_report` | 시설·안전 사고 보고는 제품 번들에 포함하되 CAPA 전체 연계 전까지 런처 기본 비노출 | 동일. DB `facility_incident_reports`·탭 `facility-incidents`는 capability 활성 시 사용 |
| `seat_room` | 좌석·룸 배정/예약 UX가 W2에서 등록·목록 수준만 제공되어 런처 기본 비노출 (`booking`은 필수 cap으로 유지) | 동일. `seat_rooms`·탭 `seat-rooms`는 capability 활성 시 사용 |

`requiredCapabilities`에 있는 기능은 숨길 수 없습니다. 런처 타일 게이트는 `companyAppLauncherGate.test.ts`에서 검증합니다.

## 유해화학·MSDS 영속화 (W0/W3)

- [ ] `038_hazardous_substance_msds.sql` 적용 후 `core.hazardous_substances`·`chemical_usage_logs` 확인
- [ ] 앱 연동은 후속: `HAZARDOUS_SUBSTANCE_REAGENT_PERSISTENCE_ENABLED`·`TENANT_SCOPED_RESOURCES` 등록 (현재 fail-closed)
- [ ] 쓰기 권한: org 구성원 조회·수불 등록, 시약 마스터·수정·삭제는 `safety:manage` (`core.can_manage_hazardous_substances`)
