process.env.EP_MIGRATE_STRICT = '1';
await import('./apply-domain-migrations.mjs');
