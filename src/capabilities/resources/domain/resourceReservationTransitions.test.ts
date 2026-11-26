/**
 * 실행: npm run test:resource-reservation-transitions
 */
import assert from 'node:assert/strict';
import {
  evaluateResourceReservationCancel,
  evaluateResourceReservationReview,
} from './resourceReservationTransitions';

function run() {
  assert.deepEqual(evaluateResourceReservationReview('pending', true), {
    ok: true,
    action: 'approved',
  });
  assert.deepEqual(evaluateResourceReservationReview('pending', false), {
    ok: true,
    action: 'rejected',
  });
  assert.deepEqual(evaluateResourceReservationReview('approved', true), {
    ok: true,
    action: 'idempotent',
  });
  assert.deepEqual(evaluateResourceReservationReview('rejected', false), {
    ok: true,
    action: 'idempotent',
  });
  assert.deepEqual(evaluateResourceReservationReview('approved', false), {
    ok: false,
    reason: 'not_reviewable',
  });
  assert.deepEqual(evaluateResourceReservationReview('cancelled', true), {
    ok: false,
    reason: 'not_reviewable',
  });
  assert.deepEqual(evaluateResourceReservationReview('completed', false), {
    ok: false,
    reason: 'not_reviewable',
  });

  assert.deepEqual(evaluateResourceReservationCancel('pending'), {
    ok: true,
    action: 'cancelled',
  });
  assert.deepEqual(evaluateResourceReservationCancel('approved'), {
    ok: true,
    action: 'cancelled',
  });
  assert.deepEqual(evaluateResourceReservationCancel('cancelled'), {
    ok: true,
    action: 'idempotent',
  });
  assert.deepEqual(evaluateResourceReservationCancel('rejected'), {
    ok: false,
    reason: 'not_cancellable',
  });
  assert.deepEqual(evaluateResourceReservationCancel('completed'), {
    ok: false,
    reason: 'not_cancellable',
  });

  console.log('resourceReservationTransitions.test.ts: ok');
}

run();