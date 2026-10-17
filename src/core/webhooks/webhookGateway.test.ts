import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  verifyWebhookSignature,
  parseAndNormalizeLeadWebhook,
  parseAndNormalizeMesWebhook,
} from './webhookGateway';

function testWebhookSignatureVerification(): void {
  const secret = 'moa_whsec_test_key_12345';
  const rawPayload = JSON.stringify({
    organization_id: 'org-abc',
    customer_name: '테스터',
    phone: '01011112222',
  });
  const nowEpoch = Math.floor(Date.now() / 1000).toString();

  // 정상 서명 생성
  const hmac = createHmac('sha256', secret);
  hmac.update(`${nowEpoch}.${rawPayload}`);
  const validSignature = `sha256=${hmac.digest('hex')}`;

  // 1. 유효한 서명 검증 성공
  const resValid = verifyWebhookSignature({
    signatureHeader: validSignature,
    timestampHeader: nowEpoch,
    rawPayload,
    webhookSecret: secret,
  });
  assert.equal(resValid.isValid, true);

  // 2. 위조된 서명 차단
  const resTampered = verifyWebhookSignature({
    signatureHeader: 'sha256=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    timestampHeader: nowEpoch,
    rawPayload,
    webhookSecret: secret,
  });
  assert.equal(resTampered.isValid, false);
  assert.match(resTampered.error!, /INVALID_SIGNATURE/);

  // 3. 만료된 타임스탬프 (10분 전) Replay Attack 차단
  const expiredEpoch = (Math.floor(Date.now() / 1000) - 600).toString();
  const hmacExpired = createHmac('sha256', secret);
  hmacExpired.update(`${expiredEpoch}.${rawPayload}`);
  const expiredSignature = `sha256=${hmacExpired.digest('hex')}`;

  const resExpired = verifyWebhookSignature({
    signatureHeader: expiredSignature,
    timestampHeader: expiredEpoch,
    rawPayload,
    webhookSecret: secret,
  });
  assert.equal(resExpired.isValid, false);
  assert.match(resExpired.error!, /TIMESTAMP_OUT_OF_BOUNDS/);
}

function testLeadWebhookParsing(): void {
  // 정상 리드 파싱
  const lead = parseAndNormalizeLeadWebhook({
    organization_id: 'org-123',
    customer_name: '  강감찬  ',
    phone: '  010-3333-4444  ',
    source: 'instagram',
    target_program: '원데이 클래스',
  });
  assert.equal(lead.organization_id, 'org-123');
  assert.equal(lead.customer_name, '강감찬');
  assert.equal(lead.phone, '010-3333-4444');
  assert.equal(lead.source, 'instagram');

  // 필수 필드 누락 시 에러 방출
  assert.throws(() => {
    parseAndNormalizeLeadWebhook({ customer_name: '무명' });
  }, /organization_id is required/);
}

function testMesWebhookParsing(): void {
  const mes = parseAndNormalizeMesWebhook({
    organization_id: 'org-mfg',
    task_order_id: 'task-777',
    completed_quantity: 150,
    defect_quantity: 3,
    machine_id: 'CNC-01',
  });
  assert.equal(mes.organization_id, 'org-mfg');
  assert.equal(mes.task_order_id, 'task-777');
  assert.equal(mes.completed_quantity, 150);
  assert.equal(mes.defect_quantity, 3);
  assert.equal(mes.machine_id, 'CNC-01');

  // 잘못된 수량 차단
  assert.throws(() => {
    parseAndNormalizeMesWebhook({
      organization_id: 'org-mfg',
      task_order_id: 'task-777',
      completed_quantity: -5,
    });
  }, /completed_quantity must be a non-negative number/);
}

function run(): void {
  testWebhookSignatureVerification();
  testLeadWebhookParsing();
  testMesWebhookParsing();
  console.log('webhookGateway.test.ts: ok');
}

run();
