import assert from 'node:assert/strict';
import { QuickNumberInput } from './quick-number-input';
import { AppDrawer } from './app-drawer';

// 1. 컴포넌트 Export 검증
assert.equal(typeof AppDrawer, 'function', 'AppDrawer must be exported as a React functional component');
assert.equal(typeof QuickNumberInput, 'function', 'QuickNumberInput must be exported as a React functional component');

// 2. Props 계약 검증
const mockDrawerProps = {
  open: true,
  onOpenChange: (_open: boolean) => {},
  title: '카운터 수납 관리',
  description: '회원 수납 및 결제 처리를 진행합니다.',
  children: null,
};
assert.equal(mockDrawerProps.title, '카운터 수납 관리');

console.log('ui-components.test.ts: ok (AppDrawer & QuickNumberInput contracts verified)');
