import assert from 'node:assert/strict';
import { readOfficeSupplyRequestSettings } from './officeSupplyRequestSettings';

{
  const defaults = readOfficeSupplyRequestSettings({});
  assert.equal(defaults.monthlyCutoffDay, 25);
  assert.equal(defaults.maxMonthlyBudgetPerUser, 50000);
}

{
  const nested = readOfficeSupplyRequestSettings({
    office_supply_request: {
      monthlyCutoffDay: 10,
      maxMonthlyBudgetPerUser: 30000,
    },
  });
  assert.equal(nested.monthlyCutoffDay, 10);
  assert.equal(nested.maxMonthlyBudgetPerUser, 30000);
}

{
  const flat = readOfficeSupplyRequestSettings({
    office_supply_request_monthlyCutoffDay: '15',
    office_supply_request_maxMonthlyBudgetPerUser: '0',
  });
  assert.equal(flat.monthlyCutoffDay, 15);
  assert.equal(flat.maxMonthlyBudgetPerUser, null);
}

{
  const snake = readOfficeSupplyRequestSettings({
    office_supply_request: {
      monthly_cutoff_day: 28,
      max_monthly_budget_per_user: 100000,
    },
  });
  assert.equal(snake.monthlyCutoffDay, 28);
  assert.equal(snake.maxMonthlyBudgetPerUser, 100000);
}

console.log('[test:office-supply-request-settings] ok');
