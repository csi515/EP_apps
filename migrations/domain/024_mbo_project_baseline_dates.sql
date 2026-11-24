-- MBO 실행 과제: 최초 일정(baseline) 보존, start/target = 현재 일정
ALTER TABLE core.mbo_projects
  ADD COLUMN IF NOT EXISTS baseline_start_date date,
  ADD COLUMN IF NOT EXISTS baseline_target_date date;

UPDATE core.mbo_projects
SET
  baseline_start_date = COALESCE(baseline_start_date, start_date),
  baseline_target_date = COALESCE(baseline_target_date, target_date)
WHERE baseline_start_date IS NULL OR baseline_target_date IS NULL;

ALTER TABLE core.mbo_projects
  ALTER COLUMN baseline_start_date SET NOT NULL,
  ALTER COLUMN baseline_target_date SET NOT NULL;

COMMENT ON COLUMN core.mbo_projects.baseline_start_date IS '최초 확정 시작일 (변경 시에도 유지)';
COMMENT ON COLUMN core.mbo_projects.baseline_target_date IS '최초 확정 종료일 (변경 시에도 유지)';
COMMENT ON COLUMN core.mbo_projects.start_date IS '현재 시작일';
COMMENT ON COLUMN core.mbo_projects.target_date IS '현재 종료일';
