/**
 * AutoSchemaForm & EP_apps Capability Setup Schema Compatibility.
 */
import assert from 'node:assert/strict';
import {
  AutoSchemaForm,
  AutoSchemaModal,
  buildZodSchemaFromSetupSchema,
  extractDefaultValuesFromSetupSchema,
} from './index';
import { bookingSetupSchema } from '@/capabilities/booking/setupSchema';
import { inventorySetupSchema } from '@/capabilities/inventory/setupSchema';
import { seatRoomSetupSchema } from '@/capabilities/seat_room/setupSchema';
import { rentalEquipmentSetupSchema } from '@/capabilities/rental_equipment/setupSchema';
import { maintenanceChecklistSetupSchema } from '@/capabilities/maintenance_checklist/setupSchema';
import { supply_restockSetupSchema } from '@/capabilities/supply_restock/setupSchema';
import { sopRiskAssessmentSetupSchema } from '@/capabilities/sop_risk_assessment/setupSchema';
import { approvalWorkflowSetupSchema } from '@/capabilities/approval_workflow/setupSchema';

function runSchemaFormTests(): void {
  console.log('🧪 [Test Suite] AutoSchemaForm & Capability Setup Schema Compatibility\n');

  {
    console.log('  ▶ Test 1: 컴포넌트 export 검증');
    assert.equal(typeof AutoSchemaForm, 'function', 'AutoSchemaForm은 유효한 React 컴포넌트여야 함');
    assert.equal(typeof AutoSchemaModal, 'function', 'AutoSchemaModal은 유효한 React 컴포넌트여야 함');
    assert.equal(typeof buildZodSchemaFromSetupSchema, 'function');
    assert.equal(typeof extractDefaultValuesFromSetupSchema, 'function');
    console.log('    ✓ 통과');
  }

  {
    console.log('  ▶ Test 2: EP_apps Capability setupSchema 런타임 변환 검증');
    const representativeSchemas = [
      bookingSetupSchema,
      inventorySetupSchema,
      seatRoomSetupSchema,
      rentalEquipmentSetupSchema,
      maintenanceChecklistSetupSchema,
      supply_restockSetupSchema,
      sopRiskAssessmentSetupSchema,
      approvalWorkflowSetupSchema,
    ];

    for (const schema of representativeSchemas) {
      assert.ok(schema.capabilityId, 'capabilityId가 정의되어 있어야 함');
      assert.ok(schema.title, `${schema.capabilityId} title이 정의되어 있어야 함`);
      assert.ok(Array.isArray(schema.fields), `${schema.capabilityId} fields 배열이어야 함`);

      const zodSchema = buildZodSchemaFromSetupSchema(schema);
      assert.ok(zodSchema, `${schema.capabilityId} Zod 스키마 빌드 성공해야 함`);

      const defaults = extractDefaultValuesFromSetupSchema(schema);
      assert.ok(defaults && typeof defaults === 'object', `${schema.capabilityId} 기본값 객체 추출 성공해야 함`);

      const parsed = zodSchema.safeParse(defaults);
      assert.equal(
        parsed.success,
        true,
        `${schema.capabilityId}의 기본값은 생성된 Zod 스키마를 통과해야 함: ${JSON.stringify(parsed.error?.format())}`
      );
    }
    console.log(`    ✓ ${representativeSchemas.length}개 스키마 통과`);
  }

  console.log('\nAutoSchemaForm.test.ts: ok');
}

runSchemaFormTests();
