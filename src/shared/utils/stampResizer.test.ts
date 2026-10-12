import assert from 'node:assert/strict';
import {
  calculateAspectRatioFit,
  DEFAULT_STAMP_MAX_WIDTH,
  DEFAULT_STAMP_MAX_HEIGHT,
  DEFAULT_STAMP_MAX_BYTES,
  resizeStampImage,
} from './stampResizer';

async function runTests() {
  // 1. Aspect ratio calculations
  const fitSquare = calculateAspectRatioFit(400, 400, 200, 200);
  assert.deepEqual(fitSquare, { width: 200, height: 200 });

  const fitWide = calculateAspectRatioFit(800, 400, 200, 200);
  assert.deepEqual(fitWide, { width: 200, height: 100 });

  const fitTall = calculateAspectRatioFit(300, 600, 200, 200);
  assert.deepEqual(fitTall, { width: 100, height: 200 });

  const fitSmaller = calculateAspectRatioFit(150, 100, 200, 200);
  // Smaller than max should retain original dimensions (not upscale)
  assert.deepEqual(fitSmaller, { width: 150, height: 100 });

  // 2. Constants verification
  assert.equal(DEFAULT_STAMP_MAX_WIDTH, 200);
  assert.equal(DEFAULT_STAMP_MAX_HEIGHT, 200);
  assert.equal(DEFAULT_STAMP_MAX_BYTES, 200 * 1024);

  // 3. Fallback in non-browser environment
  const dummyBlob = new Blob(['mock-stamp-data'], { type: 'image/png' });
  const result = await resizeStampImage(dummyBlob);
  assert.ok(result instanceof Blob);

  console.log('stampResizer tests passed!');
}

void runTests();
