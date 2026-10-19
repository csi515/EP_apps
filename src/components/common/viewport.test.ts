import assert from 'node:assert/strict';
import { isDesktopViewport } from './viewport';

assert.equal(isDesktopViewport(1024), true);
assert.equal(isDesktopViewport(390), false);

console.log('viewport.test.ts: ok');
