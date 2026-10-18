/**
 * 30대 전방위 업종 프리셋 레시피 정의 (Definitions)
 * 
 * Core–Capability–Preset 아키텍처 원칙:
 * - 6대 핵심 비즈니스 카테고리(SPORTS, BEAUTY, SPACE, CRAFT, FIELD, CORP) 정적 카탈로그
 * - 업종별 전용 코드를 중복 구현하지 않고, 원자적 Capability 추천 목록과 맞춤 용어(Terms)를 선언적으로 정의
 */

import type { PresetCapabilityId } from './types';

export type PresetCategory = 'SPORTS' | 'BEAUTY' | 'SPACE' | 'CRAFT' | 'FIELD' | 'CORP';

export interface PresetTermsDefinition {
  customer: string;
  space?: string;
  pass?: string;
  instructor?: string;
}

export interface IndustryPresetDefinitionItem {
  id: string;
  name: string;
  category: PresetCategory;
  recommendedCapabilities: PresetCapabilityId[];
  defaultTerms: PresetTermsDefinition;
}

export const PRESET_DEFINITIONS: readonly IndustryPresetDefinitionItem[] = [
  // ==========================================
  // [레저/스포츠] SPORTS (6종)
  // ==========================================
  {
    id: 'indoor_golf',
    name: '실내골프',
    category: 'SPORTS',
    recommendedCapabilities: ['booking', 'passes', 'seat_room', 'time_block_rental', 'billing_invoicing', 'promotional_deal'],
    defaultTerms: { customer: '회원', space: '타석/룸', pass: '골프이용권', instructor: '레슨프로' },
  },
  {
    id: 'tennis_pickleball',
    name: '테니스/피클볼',
    category: 'SPORTS',
    recommendedCapabilities: ['booking', 'passes', 'seat_room', 'rental_equipment', 'billing_invoicing', 'waitlist_queue'],
    defaultTerms: { customer: '회원', space: '코트', pass: '코트이용권', instructor: '코치' },
  },
  {
    id: 'climbing_gym',
    name: '클라이밍짐',
    category: 'SPORTS',
    recommendedCapabilities: ['passes', 'attendance', 'safety_consent', 'rental_equipment', 'billing_invoicing', 'promotional_deal'],
    defaultTerms: { customer: '클라이머', space: '볼더링월/지구력존', pass: '암장패스', instructor: '강사/세터' },
  },
  {
    id: 'youth_swim_soccer',
    name: '유소년수영/축구',
    category: 'SPORTS',
    recommendedCapabilities: ['attendance', 'passes', 'parent', 'vehicle_shuttle', 'safety_consent', 'billing_invoicing'],
    defaultTerms: { customer: '원생/유소년', space: '수영레인/구장', pass: '수강권', instructor: '지도코치' },
  },
  {
    id: 'taekwondo_dojo',
    name: '태권도/도장',
    category: 'SPORTS',
    recommendedCapabilities: ['attendance', 'passes', 'parent', 'level_assessment', 'vehicle_shuttle', 'billing_invoicing'],
    defaultTerms: { customer: '수련생', space: '수련실/도장', pass: '월수련권', instructor: '사범' },
  },
  {
    id: 'unmanned_gym',
    name: '무인헬스장',
    category: 'SPORTS',
    recommendedCapabilities: ['entry_pass_ticket', 'passes', 'qr_smart_stamp', 'facility_incident_report', 'billing_invoicing', 'promotional_deal'],
    defaultTerms: { customer: '회원', space: '운동존/머신존', pass: '헬스이용권' },
  },

  // ==========================================
  // [뷰티/케어] BEAUTY (6종)
  // ==========================================
  {
    id: 'hair_salon',
    name: '헤어살롱',
    category: 'BEAUTY',
    recommendedCapabilities: ['booking', 'passes', 'treatment_chart', 'treatment_portfolio', 'inventory', 'billing_invoicing'],
    defaultTerms: { customer: '고객', space: '시술대/체어', pass: '시술권/정액권', instructor: '헤어디자이너' },
  },
  {
    id: 'nail_eyelash',
    name: '네일/속눈썹',
    category: 'BEAUTY',
    recommendedCapabilities: ['booking', 'passes', 'treatment_chart', 'inventory', 'loyalty_stamp', 'billing_invoicing'],
    defaultTerms: { customer: '고객', space: '네일테이블/베드', pass: '회원권/적립금', instructor: '시술아티스트' },
  },
  {
    id: 'skin_aesthetic',
    name: '피부관리/에스테틱',
    category: 'BEAUTY',
    recommendedCapabilities: ['booking', 'passes', 'treatment_chart', 'safety_consent', 'space_turnaround', 'trial_funnel', 'billing_invoicing'],
    defaultTerms: { customer: '고객/회원', space: '관리룸/스킨케어실', pass: '관리회차권', instructor: '에스테티션' },
  },
  {
    id: 'pet_grooming',
    name: '반려미용',
    category: 'BEAUTY',
    recommendedCapabilities: ['booking', 'pet_grooming_hotel', 'safety_consent', 'passes', 'billing_invoicing'],
    defaultTerms: { customer: '보호자/반려견', space: '미용부스/드라이룸', pass: '미용회차권', instructor: '그루머/미용사' },
  },
  {
    id: 'pet_hotel',
    name: '반려호텔',
    category: 'BEAUTY',
    recommendedCapabilities: ['booking', 'dormitory_bed', 'pet_grooming_hotel', 'daily_care_report', 'billing_invoicing'],
    defaultTerms: { customer: '보호자/반려동물', space: '호텔룸/플레이존', pass: '숙박이용권' },
  },
  {
    id: 'psychology_counseling',
    name: '심리상담',
    category: 'BEAUTY',
    recommendedCapabilities: ['booking', 'consultation_crm', 'treatment_chart', 'digital_contract', 'billing_invoicing'],
    defaultTerms: { customer: '내담자', space: '상담실', pass: '상담세션권', instructor: '상담전문가' },
  },

  // ==========================================
  // [공간/렌탈] SPACE (6종)
  // ==========================================
  {
    id: 'party_room',
    name: '무인파티룸',
    category: 'SPACE',
    recommendedCapabilities: ['booking', 'seat_room', 'time_block_rental', 'space_turnaround', 'deposit_escrow', 'billing_invoicing'],
    defaultTerms: { customer: '예약자/게스트', space: '파티룸' },
  },
  {
    id: 'rental_studio',
    name: '렌탈스튜디오',
    category: 'SPACE',
    recommendedCapabilities: ['booking', 'time_block_rental', 'rental_equipment', 'space_turnaround', 'billing_invoicing'],
    defaultTerms: { customer: '촬영작가/고객', space: '스튜디오 호수', pass: '시간대여권' },
  },
  {
    id: 'music_rehearsal_studio',
    name: '악기합주실',
    category: 'SPACE',
    recommendedCapabilities: ['booking', 'time_block_rental', 'seat_room', 'rental_equipment', 'billing_invoicing', 'waitlist_queue'],
    defaultTerms: { customer: '뮤지션/밴드', space: '합주실/룸', pass: '합주이용권' },
  },
  {
    id: 'self_photo_studio',
    name: '셀프사진관',
    category: 'SPACE',
    recommendedCapabilities: ['booking', 'time_block_rental', 'space_turnaround', 'inventory', 'billing_invoicing'],
    defaultTerms: { customer: '고객/촬영자', space: '촬영부스' },
  },
  {
    id: 'shared_kitchen',
    name: '공유주방',
    category: 'SPACE',
    recommendedCapabilities: ['booking', 'seat_room', 'hygiene_haccp_log', 'safety_consent', 'rental_equipment', 'billing_invoicing'],
    defaultTerms: { customer: '입점요리사/사업자', space: '조리베이/주방' },
  },
  {
    id: 'board_game_cafe',
    name: '보드게임카페',
    category: 'SPACE',
    recommendedCapabilities: ['seat_room', 'time_block_rental', 'table_order_kds', 'inventory', 'billing_invoicing'],
    defaultTerms: { customer: '손님', space: '게임테이블' },
  },

  // ==========================================
  // [주문제작/공방] CRAFT (6종)
  // ==========================================
  {
    id: 'custom_cake',
    name: '수제케이크',
    category: 'CRAFT',
    recommendedCapabilities: ['custom_order_craft', 'recipe_bom', 'pickup_orders', 'billing_invoicing', 'trial_funnel'],
    defaultTerms: { customer: '주문고객', pass: '예약주문권' },
  },
  {
    id: 'flower_shop',
    name: '플라워샵',
    category: 'CRAFT',
    recommendedCapabilities: ['inventory', 'custom_order_craft', 'pickup_orders', 'billing_invoicing', 'loyalty_stamp'],
    defaultTerms: { customer: '고객', instructor: '플로리스트' },
  },
  {
    id: 'wood_pottery_workshop',
    name: '목공/도예공방',
    category: 'CRAFT',
    recommendedCapabilities: ['passes', 'time_block_rental', 'safety_consent', 'rental_equipment', 'custom_order_craft', 'billing_invoicing'],
    defaultTerms: { customer: '수강생/작가', space: '작업대/물레', pass: '공방이용권', instructor: '작가/마스터' },
  },
  {
    id: 'bicycle_repair',
    name: '자전거수리',
    category: 'CRAFT',
    recommendedCapabilities: ['work_order_kanban', 'service_warranty_claim', 'inventory', 'billing_invoicing'],
    defaultTerms: { customer: '라이더/고객', space: '정비베이', instructor: '미캐닉/정비사' },
  },
  {
    id: 'clothing_alteration',
    name: '의류수선',
    category: 'CRAFT',
    recommendedCapabilities: ['work_order_kanban', 'laundry_drycleaning', 'custom_order_craft', 'billing_invoicing'],
    defaultTerms: { customer: '의뢰인', instructor: '수선장인' },
  },
  {
    id: 'smartphone_repair',
    name: '스마트폰수리',
    category: 'CRAFT',
    recommendedCapabilities: ['work_order_kanban', 'service_warranty_claim', 'inventory', 'billing_invoicing'],
    defaultTerms: { customer: '고객', instructor: '엔지니어' },
  },

  // ==========================================
  // [출장/방문] FIELD (3종)
  // ==========================================
  {
    id: 'mobile_car_wash',
    name: '출장세차',
    category: 'FIELD',
    recommendedCapabilities: ['field_dispatch', 'booking', 'passes', 'promotional_deal', 'billing_invoicing'],
    defaultTerms: { customer: '차주/고객', pass: '세차정기권', instructor: '파견기사/매니저' },
  },
  {
    id: 'appliance_cleaning',
    name: '가전/에어컨청소',
    category: 'FIELD',
    recommendedCapabilities: ['field_dispatch', 'booking', 'safety_consent', 'billing_invoicing', 'promotional_deal'],
    defaultTerms: { customer: '고객', instructor: '방문클리너' },
  },
  {
    id: 'home_pt_tutoring',
    name: '방문홈PT/과외',
    category: 'FIELD',
    recommendedCapabilities: ['field_dispatch', 'booking', 'passes', 'curriculum_progress', 'billing_invoicing'],
    defaultTerms: { customer: '수강회원/학생', pass: '방문수업권', instructor: '방문트레이너/선생님' },
  },

  // ==========================================
  // [기업/사내] CORP (3종)
  // ==========================================
  {
    id: 'corp_inhouse_gym',
    name: '사내헬스장',
    category: 'CORP',
    recommendedCapabilities: ['attendance', 'entry_pass_ticket', 'passes', 'safety_consent', 'locker'],
    defaultTerms: { customer: '임직원', space: '사내운동존', pass: '사원패스', instructor: '사내코치' },
  },
  {
    id: 'corp_hotdesking',
    name: '거점오피스(핫데스킹)',
    category: 'CORP',
    recommendedCapabilities: ['seat_room', 'time_block_rental', 'key_access_control', 'kiosk_staff_call'],
    defaultTerms: { customer: '임직원/파트너', space: '핫데스크/포커스룸' },
  },
  {
    id: 'corp_shared_equipment',
    name: '공용장비실',
    category: 'CORP',
    recommendedCapabilities: ['rental_equipment', 'maintenance_checklist', 'safety_consent', 'equipment_lifecycle'],
    defaultTerms: { customer: '연구원/담당자', space: '장비실', instructor: '장비관리자' },
  },
] as const;

export function getPresetDefinition(id: string): IndustryPresetDefinitionItem | undefined {
  return PRESET_DEFINITIONS.find((p) => p.id === id);
}

export function listPresetDefinitionsByCategory(category: PresetCategory): IndustryPresetDefinitionItem[] {
  return PRESET_DEFINITIONS.filter((p) => p.category === category);
}
