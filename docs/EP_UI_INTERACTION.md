# EP_apps UI 상호작용·스타일·모션

사내 업무 UI는 `@/shared/components/ui` 프리미티브를 우선 사용한다. Capability·페이지에서 버튼/인풋/셀렉트 스타일을 로컬로 복제하지 않는다.

관련 코드: `src/shared/components/ui/`  
에이전트 규칙: `.cursor/rules/ep-ui-interaction.mdc`

---

## 1. 컨트롤 매핑

| 역할 | 컴포넌트 |
|------|----------|
| CTA / 제출 / 승인 | `Button` `primary` \| `success` + `isLoading` |
| 취소 · 보조 | `outline` \| `ghost` |
| 삭제 · 반려 | `destructive` |
| 아이콘만 | `size="icon-md"` (터치 44px) |
| 텍스트 입력 | `Input` + `FormField` |
| select | native `<select className={FORM_CONTROL_CLASS}>` + `FormField` |
| 탭 / 모드 | `SegmentedControl` \| `FilterTabs` |
| 검색 | `SearchField` |
| 최초 로딩 | `PageListSkeleton` \| `Skeleton` |
| refetch | `InlineBusy` |
| 빈 화면 | `EmptyState` \| `EmptyStateHero` |
| 오버레이 | 공용 `Modal` (커스텀 `fixed inset-0` 시트 신규 금지) |
| 패널 전환 페이드 | `ContentFadeIn` |
| 페이지 fetch 막대 | `PageProgressBar` |

### 예시

```tsx
import {
  Button,
  FormField,
  FORM_CONTROL_CLASS,
  Input,
  ContentFadeIn,
  PageProgressBar,
} from '@/shared/components/ui';

<Button variant="primary" isLoading={busy} type="submit">저장</Button>

<FormField label="공개범위" htmlFor="vis">
  <select id="vis" className={FORM_CONTROL_CLASS} value={v} onChange={...}>
    <option value="PRIVATE">비공개</option>
  </select>
</FormField>

<PageProgressBar active={isFetching} />
<ContentFadeIn motionKey={panel}>{children}</ContentFadeIn>
```

---

## 2. 플레이스홀더 · 호버

- **placeholder**: 짧은 안내만 (`이름·초성`, `사유를 입력하세요`). 예문·업무 규칙은 `FormField hint` 또는 상단 안내 박스.
- **호버**: 클릭 가능 컨트롤에만. 읽기 전용 텍스트·배지·잠금 라벨에 hover 장식 금지. 호버 스타일은 프리미티브에 맡긴다.

---

## 3. 모션 (허용 / 금지)

화면마다 커스텀 `@keyframes` 를 만들지 않는다. 아래 표만 사용한다.

| 이펙트 | 용도 | 구현 |
|--------|------|------|
| 모달·시트 진입 | 오버레이 | `Modal` (`fade-in` + 모바일 `slide-in-from-bottom` / 데스크탑 `zoom-in-95`) |
| 패널 콘텐츠 페이드 | 탭 전환 직후 본문 | `ContentFadeIn` (`uiMotion.CONTENT_FADE`, `motionKey`로 리마운트) |
| 스켈레톤 → 데이터 | 목록 첫 로드 완료 | 스켈레톤 제거 후 `ContentFadeIn` 1회 |
| 페이지 상단 프로그레스 | 라우트·허브 fetch | `PageProgressBar` |
| 진행률 채움 | KPI·진척 바 | `uiMotion.PROGRESS_WIDTH` |
| 칩/세그먼트 눌림 | 탭·필터 | `active:scale-[0.98]` (`SegmentedControl` / `FilterTabs` 내장) |
| 아코디언 셰브론 | 접기/펼치기 | `transition-transform` + `rotate-180` |
| 저장 성공 스낵 | 설정 저장 등 | 기존 토스트·스낵 fade/slide |
| Empty hero 스태거 | 빈 상태 | `EmptyStateHero` |

**금지**: glow / blur 장식 / 펄스 CTA / 무한 bounce / purple 테마·다층 그림자 / 목록 행마다 stagger / `prefers-reduced-motion: reduce` 무시.

`ContentFadeIn`·`PageProgressBar`는 reduced-motion 시 애니메이션을 끈다.

---

## 4. 예외

간트·캘린더 드래그 핸들, 서명 패드, 지도 등 도메인 특화 인터랙션은 예외. **주변 크롬**(툴바·모달 푸터·검색)만 이 문서를 따른다.

---

## 5. 마이그레이션 원칙

1. 신규 TSX: raw `<button>` / 스타일드 `<input>` 추가 금지.
2. 기존 파일 수정 시: 닿는 컨트롤부터 프리미티브로 교체.
3. Select 라이브러리 신규 도입 없음 — native + `FORM_CONTROL_CLASS`.
