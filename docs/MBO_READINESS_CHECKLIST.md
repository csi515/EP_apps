# MBO 정상 작동 점검 체크리스트

조직도·권한·결재 연동·핵심 기능을 Postgres + PostgREST 기준으로 증명합니다.  
PGlite-only는 파일럿 통과로 치지 않습니다. ([EP_PILOT_ACCEPTANCE.md](./EP_PILOT_ACCEPTANCE.md))

## 1. 환경

Docker가 있으면:

```bash
npm run db:up:stack
npm run db:wait
npm run db:migrate:domain:strict
npm run db:seed
npm run auth:serve   # domain-smoke용 :8787 (선택: Vite /api/local-auth만으로 UI 가능)
npm run dev
```

Docker 없이 네이티브 Postgres(예: 바이너리 `:54329`) + PostgREST `:3001`도 동일 `.env` 계약으로 가능합니다.

| 확인 | 합격 |
|------|------|
| `GET /api/local-auth/health` | `ok:true`, `driver:"postgres"` |
| `GET :3001/` | 200 |
| `owner@ep.local` / `EpTest123!` 로그인 | 런처 표시 |
| `/workspace/mbo` | MBO 허브 로드 |

시드: `owner@ep.local`, `ceo@ep.local`, `hq@ep.local`, `teamlead@ep.local`, `member@ep.local`, `mbo@ep.local`, `staff@ep.local` 등 (`EpTest123!`).

마이그레이션 SoT: `mbo_objectives` + domain `008`–`011` (가시성·RLS·개정 RPC).

## 2. 전제조건 (조직·권한)

앱은 **이중 게이트**입니다.

| 전제 | 합격 기준 |
|------|-----------|
| 조직도 | `core.departments.path` 계층 + `department_members` |
| 리더 위임 | 팀장 이상 `scope_type=DESCENDANTS` |
| 직급 | `organization_roles.rank_order` (임원 100 … 사원 900) + `mbo:goals:*` 키 |
| 앱 접근 | `feature_permissions.company_app:mbo` 부여(또는 unset+역할). **deny면 차단** |
| 역할 권한 | `mbo:view`→read, `mbo:*`→write+평가, `mbo:evaluations:approve` |
| 결재 | `require_plan_approval` 기본 true → capability `approval_workflow` 활성 |
| 사이클 | `mbo_cycle_settings` (없으면 UI 기본값) |
| 캐스케이드 | 전사→부서→개인. 상위 없으면 하위 생성 실패가 정상 |

로컬 픽스처 SQL 예: `.local-pg/seed_mbo_prereqs.sql` (gitignore 디렉터리 — 재현용으로 보관·복사).

**주의:** `ACTIVE_USER`는 device-only 키이며 org suffix를 붙이지 않습니다. 그렇지 않으면 게이트가 기본 `owner`로 떨어져 deny가 무시됩니다.

## 3. 자동 게이트

```bash
npm run test:mbo-engine
npm run test:mbo-plan-approval
npm run test:mbo-monthly-checkin
npm run test:mbo-team-board
npm run test:mbo-gantt
npm run test:mbo-manager-dashboard
npm run test:mbo-two-tier-lock
npx tsx src/capabilities/mbo/domain/mboVisibilityEngine.test.ts
npx tsx src/capabilities/mbo/domain/mboGoalHierarchy.test.ts
npm run test:ep-role-seed
npm run test:published-company-apps
npm run test:company-app-features-edge
npx tsx src/services/adapters/storageContext.test.ts
npm run test:domain-smoke
npx playwright test tests/e2e/mbo-monthly-smoke.spec.ts
```

E2E: 스택이 healthy(`postgres` health + PostgREST 200)인데 create UI가 없으면 **fail**. 스택이 죽은 경우에만 skip.

## 4. 역할별 UAT

| 역할 | 시나리오 | 합격 |
|------|----------|------|
| 사원 `member@` | 타일 보임, `/workspace/mbo` 내 목표, 상위 존재 시 개인 목표·월별 체크인 | 타인 PRIVATE 미노출 |
| 팀장 `teamlead@` + DESCENDANTS | 팀 탭·팀보드·하위 열람 | 타 부서 비공개 미노출 |
| 임원/owner `ceo@` / `owner@` | 전사 목표 생성, 사이클 바, 가시성 | 가중치·계층 메시지 |
| 결재자 `mbo@` | 계획 상신 → `/workspace/approvals` → sync | sync 실패 toast |
| 부정 `staff@` + `company_app:mbo=false` | 런처에서 MBO 숨김, URL 직진입 시 거부 화면 | 게이트 통과 금지 |

기능 스모크: 생성·간트/목록, 계획결재, 월별체크인, 가시성, soft delete·개정, 팀보드.

## 5. 실패 시 우선 의심

1. Postgres/PostgREST 미기동  
2. 조직 DESCENDANTS 누락  
3. `ACTIVE_USER` org-scoped 잔존 / device-only 미적용  
4. `company_app:mbo` deny vs 역할 이중 게이트  
5. `approval_workflow` 미활성 + `require_plan_approval`  
6. 마이그레이션 `008`–`011` 미적용  

## 검증 기록 (2026-11-11 로컬)

| 항목 | 결과 |
|------|------|
| 네이티브 PG 17.4 `:54329` + PostgREST 12.2.3 `:3001` | 기동 |
| migrate 001–018 + seed 20 memberships | OK |
| 조직도 HQ/운영팀 + DESCENDANTS | 시드 OK |
| MBO 유닛/계약/access/storageContext | green |
| `test:domain-smoke` | passed |
| `mbo-monthly-smoke` E2E | passed (skip 없음) |
| staff deny (`company_app:mbo=false`) | 런처 숨김 + 거부 화면 OK (ACTIVE_USER device-only 수정 후) |
