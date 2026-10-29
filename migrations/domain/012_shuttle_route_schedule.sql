-- 통근 셔틀 노선 시간표형 입력: 차량번호·퇴근 안내·정류장 비고

ALTER TABLE core.shuttle_routes
  ADD COLUMN IF NOT EXISTS vehicle_number TEXT,
  ADD COLUMN IF NOT EXISTS return_is_reverse BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS weekday_return_time TIME,
  ADD COLUMN IF NOT EXISTS friday_return_time TIME;

COMMENT ON COLUMN core.shuttle_routes.vehicle_number IS '운행 차량 번호(표시용)';
COMMENT ON COLUMN core.shuttle_routes.return_is_reverse IS '퇴근 시 정류장 역순 운행 여부';
COMMENT ON COLUMN core.shuttle_routes.weekday_return_time IS '월~목 퇴근 출발 시각';
COMMENT ON COLUMN core.shuttle_routes.friday_return_time IS '금요일 퇴근 출발 시각';

ALTER TABLE core.shuttle_stops
  ADD COLUMN IF NOT EXISTS remark TEXT;

ALTER TABLE core.shuttle_stops
  ALTER COLUMN stop_name TYPE VARCHAR(200);

COMMENT ON COLUMN core.shuttle_stops.remark IS '정류장 비고(사람 안탐 등)';
