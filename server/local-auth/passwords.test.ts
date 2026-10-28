import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './passwords';

const hash = hashPassword('EpTest123!');
assert.ok(hash.includes(':'));
assert.equal(verifyPassword('EpTest123!', hash), true);
assert.equal(verifyPassword('wrong', hash), false);
console.log('passwords.test.ts: ok');
