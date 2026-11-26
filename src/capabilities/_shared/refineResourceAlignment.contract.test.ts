/**
 * capability resources.ts 선언 리소스명 ↔ dataProvider TENANT_SCOPED_RESOURCES 정렬.
 * 실행: npm run test:refine-resource-alignment
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TENANT_SCOPED_RESOURCES } from '@/providers/dataProvider';

const capabilitiesRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const tenantSet = new Set<string>(TENANT_SCOPED_RESOURCES);

/** Refine 라우트 전용·미등록 영속·공유 카탈로그 등 — TENANT 등록 전 명시 면제 */
const REFINE_RESOURCE_ALIGNMENT_EXEMPT: Record<string, string> = {
  training_ack: 'UI hub resource; tenant CRUD via training_* tables (후속 등록)',
  training_ack_manage: 'admin surface; same',
  recipe_bom: 'navigation-only until BOM persistence',
  shuttle_routes: 'shuttle UI routes; domain PG 후속',
  shuttle_roster: 'shuttle UI routes',
  shuttle_my: 'employee self-service route',
  risk_assessments: 'SOP risk UI; sop tables 후속',
  risk_assessment_approvals: 'approval shell',
  volunteer_activities: 'volunteer hub',
  volunteer_manage: 'volunteer admin',
  patent_inventors: 'nested patent UI',
  equipment_lifecycle: 'lifecycle UI; asset PG 후속',
  office_supply_request: 'request UX',
  office_supply_manage: 'procurement admin UX',
  office_supply_catalog: 'shared catalog reference',
  facility_incident_reports: 'incident PG 연동 후속',
  meal_survey: 'survey hub',
  meal_survey_manage: 'survey admin',
  meal_survey_settings: 'survey settings',
};

function discoverResourcesFiles(): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(capabilitiesRoot)) {
    const capDir = join(capabilitiesRoot, ent);
    if (!statSync(capDir).isDirectory()) continue;
    const resourcesPath = join(capDir, 'resources.ts');
    try {
      statSync(resourcesPath);
      out.push(resourcesPath);
    } catch {
      /* no resources.ts */
    }
  }
  return out.sort();
}

const NAME_RE = /name:\s*['"]([^'"]+)['"]/g;

function resourceNamesFromFile(filePath: string): string[] {
  const text = readFileSync(filePath, 'utf8');
  const names: string[] = [];
  NAME_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NAME_RE.exec(text))) {
    names.push(m[1]);
  }
  return names;
}

function main() {
  const files = discoverResourcesFiles();
  assert.ok(files.length > 0, 'expected at least one capability resources.ts');

  const gaps: { capability: string; resource: string; reason: string }[] = [];

  for (const file of files) {
    const capability = dirname(file).split(/[/\\]/).pop() ?? 'unknown';
    const names = resourceNamesFromFile(file);
    for (const name of names) {
      if (tenantSet.has(name)) continue;
      if (REFINE_RESOURCE_ALIGNMENT_EXEMPT[name]) continue;
      gaps.push({
        capability,
        resource: name,
        reason: 'not in TENANT_SCOPED_RESOURCES or REFINE_RESOURCE_ALIGNMENT_EXEMPT',
      });
    }
  }

  if (gaps.length > 0) {
    const lines = gaps.map((g) => `  ${g.capability}: ${g.resource} (${g.reason})`);
    assert.fail(`refine resource alignment gaps:\n${lines.join('\n')}`);
  }

  console.log(
    `refineResourceAlignment.contract.test.ts: ok (${files.length} capabilities, exempt map ${Object.keys(REFINE_RESOURCE_ALIGNMENT_EXEMPT).length})`,
  );
}

main();