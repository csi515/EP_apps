import assert from 'node:assert/strict';
import { ERROR_VIBRATION, SUCCESS_CHIME_HZ, SUCCESS_VIBRATION } from './sensoryFeedback';

assert.equal(SUCCESS_VIBRATION, 50);
assert.deepEqual([...ERROR_VIBRATION], [100, 50, 100]);
assert.equal(SUCCESS_CHIME_HZ[0], 1046.5);
assert.equal(SUCCESS_CHIME_HZ[1], 1567.98);

console.log('sensoryFeedback.test.ts: ok');
