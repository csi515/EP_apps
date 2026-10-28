/**
 * 명령 팔레트 카탈로그 · 필터 엣지 케이스 (학원 메뉴 제거)
 * 실행: npm run test:command-palette-edge
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COMMAND_CATALOG,
  filterCommands,
  isPaletteShortcut,
  moveCommandIndex,
  type CommandItem,
} from './commandPalette';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

console.log('[test:command-palette-edge] start');

const FORBIDDEN = [
  '출결',
  '출석',
  '원비',
  '수강',
  '학부모',
  '원생',
  '회원 등록',
  '김민수',
  '이서연',
  '/kiosk/attendance',
  '/customers',
];

for (const item of COMMAND_CATALOG) {
  for (const word of FORBIDDEN) {
    assert.equal(
      item.label.includes(word) || item.href.includes(word),
      false,
      `catalog item must not include "${word}": ${item.id} ${item.label} ${item.href}`
    );
  }
}

assert.ok(COMMAND_CATALOG.some((i) => i.href === '/workspace/approvals'));
assert.ok(COMMAND_CATALOG.some((i) => i.href === '/workspace/intranet'));
assert.ok(COMMAND_CATALOG.some((i) => i.href === '/workspace/organization'));
assert.ok(COMMAND_CATALOG.some((i) => i.href === '/rnd'));

// filter: empty / case / chosung / no match
{
  assert.equal(filterCommands('', COMMAND_CATALOG).length, COMMAND_CATALOG.length);
  assert.equal(filterCommands('   ', COMMAND_CATALOG).length, COMMAND_CATALOG.length);

  const byLabel = filterCommands('결재', COMMAND_CATALOG);
  assert.ok(byLabel.length >= 1);
  assert.ok(byLabel.every((i) => i.label.includes('결재') || (i.chosung ?? '').includes('ㅈㅈ')));

  const lower = filterCommands('ep', [
    { id: 'a', label: 'EP Portal', group: 'menu', href: '/' },
    { id: 'b', label: 'Other', group: 'menu', href: '/' },
  ] satisfies CommandItem[]);
  assert.equal(lower.length, 1);
  assert.equal(lower[0].id, 'a');

  const chosung = filterCommands('ㅈㅈㄱㅈ', COMMAND_CATALOG);
  assert.ok(chosung.some((i) => i.id === 'menu-approvals'));

  assert.equal(filterCommands('없는메뉴XYZ', COMMAND_CATALOG).length, 0);
}

// moveCommandIndex wrap / empty
{
  assert.equal(moveCommandIndex(0, 0, 1), 0);
  assert.equal(moveCommandIndex(0, 3, 1), 1);
  assert.equal(moveCommandIndex(2, 3, 1), 0);
  assert.equal(moveCommandIndex(0, 3, -1), 2);
  assert.equal(moveCommandIndex(1, 3, -1), 0);
}

// shortcut
{
  assert.equal(isPaletteShortcut({ metaKey: true, ctrlKey: false, key: 'k' }), true);
  assert.equal(isPaletteShortcut({ metaKey: false, ctrlKey: true, key: 'K' }), true);
  assert.equal(isPaletteShortcut({ metaKey: false, ctrlKey: false, key: 'k' }), false);
  assert.equal(isPaletteShortcut({ metaKey: true, ctrlKey: false, key: 'p' }), false);
}

// UI placeholder도 학원 단어 금지
{
  const paletteUi = readFileSync(
    join(root, 'src/components/common/GlobalCommandPalette.tsx'),
    'utf8'
  );
  assert.doesNotMatch(paletteUi, /출결 패드|회원,\s*시간표/);
  assert.match(paletteUi, /결재|조직도|공용자원/);
}

console.log('commandPalette.edge.test.ts: ok');
