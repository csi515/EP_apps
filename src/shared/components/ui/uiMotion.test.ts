import assert from 'node:assert/strict';
import { uiMotion } from './uiMotion';

assert.ok(uiMotion.CONTENT_FADE.includes('fade-in'));
assert.ok(uiMotion.PROGRESS_WIDTH.includes('duration-500'));
assert.ok(uiMotion.PRESS_SCALE.includes('active:scale'));

console.log('uiMotion.test.ts: ok');
