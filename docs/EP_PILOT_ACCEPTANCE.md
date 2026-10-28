# EP_apps 파일럿 수용 체크리스트

소규모 현장(`personal_plant_ops`) 일일 운영 시나리오의 합격 기준입니다.  
환경은 **Docker Postgres + PostgREST** 필수입니다. PGlite만으로는 도메인·파일럿 통과를 주장하지 않습니다.

## 환경

```bash
npm run db:up:stack
npm run db:wait
npm run db:migrate:domain:strict
npm run db:seed
npm run auth:serve
# .env: VITE_LOCAL_AUTH=true VITE_CORP_DOMAIN=true VITE_SUPABASE_URL=http://127.0.0.1:3001
npm run dev
```

시드 계정(기본): `owner@ep.local` / `EpTest123!`

## 일일 운영 시나리오 (합격 기준)

| # | 단계 | 합격 |
|---|------|------|
| 1 | 로그인 | owner 세션·멤버십·조직 컨텍스트 로드 |
| 2 | 직급/역할 | 추천 직급(임원~사원) 또는 시드 역할이 조직에 존재 |
| 3 | 결재 상신 | `approval_requests` 1건 작성(초안 이상) — UI 또는 PostgREST |
| 4 | MBO 조회 | `mbo_objectives` 목록 또는 상세 표시 |
| 5 | 재고 1건 | `inventory_items` 생성·조회 |
| 6 | 로그아웃 | 세션 종료 후 보호 경로 차단 |

자동화:

- API SoT: `npm run test:domain-smoke`
- UI 여정: `npm run test:e2e` (`tests/e2e/*.spec.ts`)

## readiness

수용 통과 후 `presetRegistry` `personal_plant_ops.readinessLevel`은 `basic_ui`입니다.  
`isolated`는 “셸만/도메인 미증명” 상태를 의미하며, 파일럿 전 단계로만 씁니다.

## 관련

- [EP_CORP_PG_DOMAIN_RUNBOOK.md](./EP_CORP_PG_DOMAIN_RUNBOOK.md)
- [EP_OPS_CHECKLIST.md](./EP_OPS_CHECKLIST.md)
