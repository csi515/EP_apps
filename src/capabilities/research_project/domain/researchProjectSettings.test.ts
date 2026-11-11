import assert from 'node:assert/strict';
import { readResearchProjectSettings } from './researchProjectSettings';

{
  const defaults = readResearchProjectSettings({});
  assert.equal(defaults.defaultGateCount, 3);
  assert.equal(defaults.requireCoLead, false);
  assert.equal(defaults.blockOverspend, true);
}

{
  const nested = readResearchProjectSettings({
    research_project: {
      default_gate_count: 5,
      require_co_lead: true,
      block_overspend: false,
    },
  });
  assert.equal(nested.defaultGateCount, 5);
  assert.equal(nested.requireCoLead, true);
  assert.equal(nested.blockOverspend, false);
}

{
  const flat = readResearchProjectSettings({
    research_project_default_gate_count: '2',
    research_project_require_co_lead: 'true',
    research_project_block_overspend: '0',
  });
  assert.equal(flat.defaultGateCount, 2);
  assert.equal(flat.requireCoLead, true);
  assert.equal(flat.blockOverspend, false);
}

console.log('[test:research-project-settings] ok');
