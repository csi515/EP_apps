import assert from 'node:assert/strict';
import { mergeOpsRuntimeSettings, readOpsRuntimeSettings } from './opsRuntimeSettings';

const empty = readOpsRuntimeSettings({});
assert.equal(empty.turnaround_buffer_minutes, 15);
assert.equal(empty.require_cleaning_checklist, true);

const nested = readOpsRuntimeSettings({
  ops_runtime: { booking_buffer_minutes: 20, seat_capacity_default: 8 },
});
assert.equal(nested.booking_buffer_minutes, 20);
assert.equal(nested.seat_capacity_default, 8);

const merged = mergeOpsRuntimeSettings({ name: '매장' }, { booking_buffer_minutes: 30 });
assert.equal((merged.ops_runtime as { booking_buffer_minutes: number }).booking_buffer_minutes, 30);
assert.equal(merged.name, '매장');

console.log('opsRuntimeSettings.test.ts: ok');
