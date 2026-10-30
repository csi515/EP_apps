import assert from 'node:assert/strict';
import {
  COMMAND_CATALOG,
  filterCommands,
  filterCommandsByAppAccess,
  isPaletteShortcut,
  moveCommandIndex,
} from './commandPalette';

assert.equal(isPaletteShortcut({ metaKey: true, ctrlKey: false, key: 'k' }), true);
assert.equal(isPaletteShortcut({ metaKey: false, ctrlKey: true, key: 'K' }), true);
assert.equal(isPaletteShortcut({ metaKey: false, ctrlKey: false, key: 'k' }), false);

const chosung = filterCommands('ㅈㅈㄱㅈ', COMMAND_CATALOG);
assert.ok(chosung.some((item) => item.id === 'menu-approvals'));

const name = filterCommands('공용자원', COMMAND_CATALOG);
assert.ok(name.some((item) => item.id === 'menu-resources' || item.id === 'menu-schedule'));

assert.equal(moveCommandIndex(0, 3, -1), 2);
assert.equal(moveCommandIndex(2, 3, 1), 0);

assert.ok(
  filterCommandsByAppAccess(COMMAND_CATALOG, { role: 'owner', customRole: null }).length ===
    COMMAND_CATALOG.length
);

console.log('commandPalette.test.ts: ok');
