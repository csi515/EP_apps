/**
 * POSCO그룹 관점의 직급·직책 구분 추천안.
 * 계열사·법인·사업장·시기별로 달라질 수 있으므로 고정값이 아니라 초안/가이드로만 사용한다.
 */

/** 직급 추천안 (인사 등급·승진 체계) — organization_roles 시드 초안에 사용 가능 */
export const RECOMMENDED_RANK_TITLES = [
  '대표이사',
  '부장',
  '차장',
  '과장',
  '대리',
  '사원',
] as const;

/** 직책 예시 (조직 내 역할·보직·책임 단위) — 직급과 별도 부여 가능, 시드에 강제하지 않음 */
export const RECOMMENDED_POSITION_EXAMPLES = [
  '리더',
  '그룹장',
  '실장',
  '팀장',
  '파트장',
  '공장장',
  '본부장',
  '센터장',
  '소장',
] as const;

export const RANK_VS_POSITION_GUIDE_KO = [
  '사원·대리·과장·차장·부장은 직급(인사 등급)으로 이해합니다.',
  '리더·그룹장·실장·팀장·파트장·공장장·본부장·센터장·소장 등은 직책(역할/보직)으로 이해합니다.',
  '직책은 직급과 별도로 부여될 수 있습니다. 예: 과장(직급)이면서 팀장(직책), 부장(직급)이면서 공장장(직책).',
  '대표이사는 조직도상 최상위 직급입니다. 시스템 관리자(admin) 계정(전권·권한 위임)과 구분합니다.',
  '계열사·사업장별로 명칭이 다를 수 있으니, 아래 목록은 추천안이며 자유롭게 수정하세요.',
].join(' ');

/** Zero-Setup textarea 초안 (직급 추천안만 — 직책은 조직도/멤버 배정에서 별도) */
export function buildRecommendedRankDraftText(): string {
  return RECOMMENDED_RANK_TITLES.join('\n');
}
