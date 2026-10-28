# EP_apps AI 개발 지침

이 파일은 에이전트가 EP_apps 프로젝트에서 작업할 때 항상 준수하는 최상위 개발 규칙입니다.

---

## 1. 아키텍처: Core – Capability – Preset

```
1. Core        (인증, 테넌트 격리, 공통 권한, 공통 설정, 확장 인터페이스)
      ↓
2. Capability  (독립 업무 영역, 업종 중립 도메인 로직)
      ↓
3. Preset      (Capability + 설정 조합 — EP_apps는 personal_plant_ops 단일 프리셋)
```

- 별도의 Domain Capability 계층을 만들지 않는다.
- Core는 개별 Capability의 업무 의미를 모른다.
- 업종 이름만 다르다는 이유로 새 Capability를 만들지 않는다.
- Preset에 중복 업무 로직을 넣지 않는다.

---

## 2. EP_apps 제품 범위

- 단일 프리셋: `personal_plant_ops` (`src/app/presets/presetRegistry.ts`)
- alias: `personal_plant`, `plant_ops`, `ep_apps`, `EP_apps`
- 포함: 결재, 안전/SOP, 현장 자재, 공용자원, 노경 건의, 조직도, MBO, 연구과제, 통근 셔틀 등
- 제외: 학원/학부모 포털, 원생·수강료·락커, Moa 44개 업종 카탈로그, 전용 업종 모듈(`src/industries`)

새 Capability를 만들기 전 6단계 검증(기존 capability/설정/조합/확장으로 해결 가능한지)을 거친다.

---

## 3. 안전 및 작업 원칙

1. 정상 동작 보존 — 레거시 삭제 시 진입점 import를 먼저 끊는다.
2. DB 안전 — 스키마 변경은 버전드 마이그레이션으로만 적용. 프로덕션 반영 전 로컬/스테이징 검증. RLS·원자적 RPC로 무결성 담보.
3. 상세 문서:
   - `docs/EP_ARCHITECTURE_BOUNDARIES.md`
   - `docs/EP_DEPENDENCY_RULES.md`
   - `docs/EP_DATA_CACHE_BOUNDARY.md`
   - `docs/EP_REFINE_RUNTIME.md`

---

## 4. 검증

커밋/푸시 전:

```bash
npm run check:all
```

모든 검사가 exit code 0이어야 한다.
