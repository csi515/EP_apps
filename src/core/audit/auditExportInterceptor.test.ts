import assert from 'node:assert/strict';
import {
  interceptExportWithAudit,
  type AuditRpcCaller,
} from './auditExportInterceptor';

async function runTests() {
  let rpcCalled = false;
  let loggedPayload: unknown = null;
  let exportExecuted = false;

  const mockSuccessfulRpc: AuditRpcCaller = async (
    orgId,
    entityType,
    entityId,
    action,
    locationId
  ) => {
    rpcCalled = true;
    loggedPayload = { orgId, entityType, entityId, action, locationId };
    return 'audit-uuid-12345';
  };

  // 1. Successful audit -> export callback executes
  const result = await interceptExportWithAudit(
    {
      organizationId: 'org-abc',
      entityType: 'customer',
      action: 'customer_list_export',
    },
    async () => {
      exportExecuted = true;
      return { downloadedRows: 50 };
    },
    mockSuccessfulRpc
  );

  assert.equal(rpcCalled, true, 'Audit RPC must be called');
  assert.equal(exportExecuted, true, 'Export callback must be executed');
  assert.deepEqual(result, { downloadedRows: 50 });

  // 2. Failed audit RPC -> export callback NEVER executes, throws error
  let blockedExportExecuted = false;
  const mockFailingRpc: AuditRpcCaller = async () => {
    throw new Error('RLS Permission Denied: Staff cannot export without authorization');
  };

  await assert.rejects(
    async () => {
      await interceptExportWithAudit(
        {
          organizationId: 'org-abc',
          entityType: 'customer',
        },
        async () => {
          blockedExportExecuted = true;
          return { data: 'leaked' };
        },
        mockFailingRpc
      );
    },
    (err: Error) => {
      assert.match(err.message, /보안 통제/);
      assert.match(err.message, /RLS Permission Denied/);
      return true;
    }
  );

  assert.equal(
    blockedExportExecuted,
    false,
    'Export must NEVER execute if audit log fails!'
  );

  console.log('auditExportInterceptor tests passed!');
}

void runTests();
