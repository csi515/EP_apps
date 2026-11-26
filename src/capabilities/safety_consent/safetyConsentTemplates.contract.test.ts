/**
 * safety_consent — 기본 템플릿 시드 계약 (W3 서버 CRUD 전)
 * 실행: npm run test:safety-consent-templates
 */
import assert from 'node:assert/strict';
import { SAFETY_CONSENT_DEFAULT_TEMPLATES } from './ui/safetyConsentTemplates';
import { stubSafetyConsentTemplateServer } from './domain/serverConsentTemplates';
import type { ConsentTemplate } from './domain/safetyConsentEngine';

const REQUIRED_KEYS: (keyof ConsentTemplate)[] = [
  'id',
  'type',
  'version',
  'title',
  'bodyText',
  'mandatoryClauses',
  'effectiveFrom',
  'isActive',
];

assert.ok(SAFETY_CONSENT_DEFAULT_TEMPLATES.length > 0, 'default templates must not be empty');

for (const tpl of SAFETY_CONSENT_DEFAULT_TEMPLATES) {
  for (const key of REQUIRED_KEYS) {
    assert.ok(tpl[key] !== undefined && tpl[key] !== null, `${tpl.id}: missing ${key}`);
  }
  assert.ok(tpl.title.trim().length >= 2, `${tpl.id}: title`);
  assert.ok(tpl.bodyText.trim().length >= 10, `${tpl.id}: bodyText`);
  assert.ok(tpl.mandatoryClauses.length >= 1, `${tpl.id}: mandatoryClauses`);
  for (const clause of tpl.mandatoryClauses) {
    assert.ok(clause.id && clause.text?.trim(), `${tpl.id}: clause shape`);
  }
  assert.match(tpl.effectiveFrom, /^\d{4}-\d{2}-\d{2}$/, `${tpl.id}: effectiveFrom`);
  assert.ok(tpl.version >= 1, `${tpl.id}: version`);
}

assert.deepEqual(await stubSafetyConsentTemplateServer.listTemplates({ organizationId: 'org' }), []);

console.log(
  '[safety-consent-templates] ok — W3 server template CRUD pending; stub port returns [] until DB/API',
);