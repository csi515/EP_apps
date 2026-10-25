import assert from 'node:assert/strict';
import { getIndustryPreset } from '@/app/presets/presetRegistry';

function run() {
  // 1. 미용실 프리셋 (hair_salon) 능력치 확인
  const salonPreset = getIndustryPreset('hair_salon');
  assert.ok(salonPreset, '미용실 프리셋 존재');
  const salonCaps = new Set(salonPreset.capabilities);

  // 미용실은 treatment_chart 및 booking이 활성화되어 있어야 함
  assert.ok(salonCaps.has('treatment_chart'), 'treatment_chart 보유');
  assert.ok(salonCaps.has('booking'), 'booking 보유');
  assert.ok(!salonCaps.has('attendance'), '미용실은 attendance(학원식 출결) 미보유');

  // 2. 피아노 학원 프리셋 (piano) 능력치 확인
  const pianoPreset = getIndustryPreset('piano');
  assert.ok(pianoPreset, '피아노 프리셋 존재');
  const pianoCaps = new Set(pianoPreset.capabilities);
  assert.ok(pianoCaps.has('attendance'), '피아노는 attendance 보유');
  assert.ok(pianoCaps.has('passes'), '피아노는 passes 보유');

  // 3. 스터디카페 프리셋 (study_cafe) 능력치 확인
  const studyPreset = getIndustryPreset('study_cafe');
  assert.ok(studyPreset, '스터디카페 프리셋 존재');
  const studyCaps = new Set(studyPreset.capabilities);
  assert.ok(studyCaps.has('seat_room'), '스터디카페는 seat_room 보유');

  console.log('MobileBottomDock.test.ts: ok');
}

run();
