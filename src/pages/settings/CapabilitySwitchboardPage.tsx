/**
 * [사이드바 메뉴 표시 관리]
 *
 * 기존 72개 전수 스위치보드 방식을 폐지하고,
 * 현재 테넌트의 업종 프리셋(Preset)에 포함된 기능만 노출하는
 * 직관적인 MenuVisibilitySettingsView를 제공합니다.
 */

import React from 'react';
import { MenuVisibilitySettingsView } from './MenuVisibilitySettingsView';

export { MenuVisibilitySettingsView };

export const CapabilitySwitchboardPage: React.FC = () => {
  return <MenuVisibilitySettingsView />;
};

export default CapabilitySwitchboardPage;
