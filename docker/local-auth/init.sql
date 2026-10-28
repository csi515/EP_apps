-- Docker 최초 기동 최소 준비. 전체 스키마는 npm run db:migrate:domain 적용.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS core;
CREATE TABLE IF NOT EXISTS app.schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
