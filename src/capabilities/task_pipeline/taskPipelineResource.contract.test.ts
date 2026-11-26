/**
 * task_pipeline Refine 리소스명 ↔ Kanban UI ↔ dataProvider 계약
 * 실행: npx tsx src/capabilities/task_pipeline/taskPipelineResource.contract.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { taskPipelineResources } from './resources';

const RESOURCE = 'task_orders';
const capabilityRoot = dirname(fileURLToPath(import.meta.url));

const declared = taskPipelineResources.resources.map((r) => r.name);
assert.ok(declared.includes(RESOURCE), 'capability resources must declare task_orders');
assert.ok(!declared.includes('task_pipelines'), 'legacy task_pipelines resource name must not remain');

const kanbanPath = join(capabilityRoot, 'ui', 'TaskPipelineKanbanView.tsx');
const kanbanSource = readFileSync(kanbanPath, 'utf8');
assert.ok(
  kanbanSource.includes(`resource: '${RESOURCE}'`),
  'TaskPipelineKanbanView must use task_orders Refine resource',
);
assert.ok(!kanbanSource.includes("resource: 'task_pipelines'"), 'Kanban must not use task_pipelines');

const dataProviderPath = join(capabilityRoot, '../../providers/dataProvider.ts');
const dataProviderSource = readFileSync(dataProviderPath, 'utf8');
assert.ok(
  dataProviderSource.includes(`"${RESOURCE}"`),
  'dataProvider tenant scope must include task_orders',
);
assert.ok(
  !dataProviderSource.includes('"task_pipelines"'),
  'dataProvider must not list legacy task_pipelines',
);

console.log('taskPipelineResource.contract.test.ts: ok');