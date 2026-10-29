/**
 * 업무 화면 WorkPageFrame 계약 — hub/form 2단 폭
 * 실행: npm run test:work-page-frame
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

function read(rel: string): string {
  const path = join(root, rel);
  assert.ok(existsSync(path), `missing: ${rel}`);
  return readFileSync(path, 'utf8');
}

console.log('[test:work-page-frame] start');

const frame = read('src/shared/components/ui/WorkPageFrame.tsx');
assert.match(frame, /hub:\s*['"]max-w-6xl['"]/);
assert.match(frame, /form:\s*['"]max-w-3xl['"]/);
assert.match(frame, /space-y-6/);
assert.match(frame, /pb-6/);
assert.doesNotMatch(frame, /\bpx-\d+\b|\bpy-\d+\b/);

const header = read('src/shared/components/ui/PageHeader.tsx');
assert.match(header, /text-xl/);
assert.doesNotMatch(header, /\bsm:text-|\bsm:flex-|\blg:/);

const samples = [
  'src/pages/workspace/CompanyAppLauncherDashboard.tsx',
  'src/capabilities/mbo/ui/MboManagementView.tsx',
  'src/pages/workspace/WorkspaceResourcesPage.tsx',
  'src/capabilities/shuttle_dispatch/ui/ShuttleRoutesPage.tsx',
  'src/capabilities/meal_survey/ui/MealSurveyMyView.tsx',
] as const;

for (const rel of samples) {
  const src = read(rel);
  assert.match(src, /WorkPageFrame/, `${rel} must use WorkPageFrame`);
  assert.doesNotMatch(src, /max-w-5xl|max-w-7xl|pb-24/, `${rel} must not use legacy width/padding`);
}

assert.match(read('src/capabilities/meal_survey/ui/MealSurveyMyView.tsx'), /width=["']form["']/);
assert.match(read('src/capabilities/mbo/ui/MboManagementView.tsx'), /width=["']hub["']/);

const mboPage = read('src/pages/workspace/WorkspaceMboPage.tsx');
assert.doesNotMatch(mboPage, /max-w-7xl|px-4 py-4/);
assert.match(mboPage, /Suspense/);

console.log('workPageFrame.contract.test.ts: ok');
