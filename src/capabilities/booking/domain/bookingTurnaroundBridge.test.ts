import assert from 'node:assert/strict';
import { readOpsRuntimeSettings } from '@/core/capabilities/opsRuntimeSettings';

const runtime = readOpsRuntimeSettings({ ops_runtime: { turnaround_buffer_minutes: 20 } });
assert.equal(runtime.turnaround_buffer_minutes, 20);

console.log('bookingTurnaroundBridge.test.ts: ok');
