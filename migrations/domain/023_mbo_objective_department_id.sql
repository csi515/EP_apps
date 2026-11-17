-- MBO 조직단위 목표에 departments FK 연결 (하향 캐스케이드)

ALTER TABLE core.mbo_objectives
  ADD COLUMN IF NOT EXISTS department_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mbo_objectives_department_id_fkey'
  ) THEN
    ALTER TABLE core.mbo_objectives
      ADD CONSTRAINT mbo_objectives_department_id_fkey
      FOREIGN KEY (department_id)
      REFERENCES core.departments(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mbo_objectives_department
  ON core.mbo_objectives (organization_id, department_id)
  WHERE department_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN core.mbo_objectives.department_id IS
  '조직단위(department level) 목표의 대상 부서. department_name은 표시용 백필.';
