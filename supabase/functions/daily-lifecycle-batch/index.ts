Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  const expected = Deno.env.get('LIFECYCLE_CRON_SECRET');
  if (expected && req.headers.get('x-cron-secret') !== expected) {
    return new Response('forbidden', { status: 403 });
  }
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    return new Response('missing supabase env', { status: 500 });
  }
  const response = await fetch(`${url}/rest/v1/rpc/batch_expire_passes_and_invoices`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  return new Response(await response.text(), { status: response.status });
});
