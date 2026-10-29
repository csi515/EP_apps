/**
 * 업무 화면 WorkPageFrame 계약 — hub/form 폭 + 공통 거터
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

const spacing = read('src/shared/components/ui/workPageSpacing.ts');
assert.match(spacing, /WORK_PAGE_GUTTER_CLASS/);
assert.match(spacing, /px-4/);
assert.match(spacing, /sm:px-6/);
assert.match(spacing, /space-y-6|WORK_PAGE_STACK_CLASS/);

const frame = read('src/shared/components/ui/WorkPageFrame.tsx');
assert.match(frame, /hub:\s*['"]max-w-6xl['"]/);
assert.match(frame, /form:\s*['"]max-w-3xl['"]/);
assert.match(frame, /WORK_PAGE_GUTTER_CLASS/);
assert.match(frame, /WORK_PAGE_STACK_CLASS/);

const moduleShell = read('src/shared/components/layout/ModuleAppShell.tsx');
assert.doesNotMatch(
  moduleShell,
  /<main[\s\S]{0,200}\bp-5\b/,
  'ModuleAppShell main must not add page gutter (WorkPageFrame owns it)'
);

const workAppShell = read('src/shared/components/layout/WorkAppShell.tsx');
assert.doesNotMatch(
  workAppShell,
  /flex-1 p-5/,
  'WorkAppShell content must not add page gutter'
);

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
