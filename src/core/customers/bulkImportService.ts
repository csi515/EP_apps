import { getCoreClient } from '@/lib/supabase';

export type BulkImportResult = {
  success?: boolean;
  failed_row_index?: number;
  error_code?: string;
};

export async function bulkImportCustomers(
  organizationId: string,
  records: { name: string; phone: string; memo?: string }[]
): Promise<BulkImportResult> {
  const client = getCoreClient();
  const rpc = client.rpc.bind(client) as (
    name: string,
    args: { p_tenant_id: string; p_records: typeof records }
  ) => Promise<{ data: BulkImportResult | null; error: { message: string } | null }>;
  const result = await rpc('bulk_import_customers', { p_tenant_id: organizationId, p_records: records });
  if (result.error) throw new Error(result.error.message);
  return result.data ?? { success: false, error_code: 'EMPTY' };
}
