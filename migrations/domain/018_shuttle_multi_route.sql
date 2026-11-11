-- 셔틀 등록: 사원당 1노선 → 사원·노선당 1행 (출근/퇴근 등 복수 노선 등록 허용)

ALTER TABLE core.shuttle_registrations
  DROP CONSTRAINT IF EXISTS shuttle_registrations_tenant_member_unique;

ALTER TABLE core.shuttle_registrations
  DROP CONSTRAINT IF EXISTS shuttle_registrations_tenant_member_route_unique;

ALTER TABLE core.shuttle_registrations
  ADD CONSTRAINT shuttle_registrations_tenant_member_route_unique
  UNIQUE (tenant_id, member_id, route_id);

COMMENT ON TABLE core.shuttle_registrations IS
  '임직원 고정 셔틀 탑승 등록 (사원·노선당 1행, 복수 노선 등록 가능)';
