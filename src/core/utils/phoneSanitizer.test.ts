import assert from 'node:assert/strict';
import { sanitizeImportPhone } from './phoneSanitizer';

assert.equal(sanitizeImportPhone('1012345678'), '010-1234-5678');
assert.equal(sanitizeImportPhone(1012345678), '010-1234-5678');
assert.equal(sanitizeImportPhone('01012345678'), '010-1234-5678');
assert.equal(sanitizeImportPhone('010-1234-5678'), '010-1234-5678');
assert.throws(() => sanitizeImportPhone('12345'), /INVALID_PHONE/);
assert.throws(() => sanitizeImportPhone('0212345678'), /INVALID_PHONE/);

console.log('phoneSanitizer.test.ts: ok');
