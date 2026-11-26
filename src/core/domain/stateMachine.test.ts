/**
 * Reservation state machine.
 * 실행: npm run test:reservation-machine
 */
import assert from 'node:assert/strict';
import { allowedCommands, IllegalStateTransitionError } from './stateMachine';
import {
  applyReservationCommand,
  canApplyReservationCommand,
  RESERVATION_MACHINE,
  RESERVATION_STATES,
} from '../schedules/reservationMachine';

function run() {
  assert.deepEqual([...RESERVATION_STATES], ['requested', 'confirmed', 'cancelled']);
  assert.equal(RESERVATION_MACHINE.initial, 'requested');

  assert.equal(applyReservationCommand('requested', 'confirm'), 'confirmed');
  assert.equal(applyReservationCommand('requested', 'cancel'), 'cancelled');
  assert.equal(applyReservationCommand('confirmed', 'cancel'), 'cancelled');

  assert.equal(canApplyReservationCommand('confirmed', 'confirm'), false);
  assert.equal(canApplyReservationCommand('cancelled', 'confirm'), false);
  assert.equal(canApplyReservationCommand('cancelled', 'cancel'), false);

  assert.throws(
    () => applyReservationCommand('confirmed', 'confirm'),
    (err: unknown) => err instanceof IllegalStateTransitionError
  );
  assert.throws(
    () => applyReservationCommand('cancelled', 'cancel'),
    (err: unknown) => err instanceof IllegalStateTransitionError
  );
  assert.throws(
    () => applyReservationCommand('cancelled', 'confirm'),
    (err: unknown) => err instanceof IllegalStateTransitionError
  );
  assert.equal(canApplyReservationCommand('requested', 'confirm'), true);
  assert.equal(canApplyReservationCommand('requested', 'cancel'), true);
  assert.equal(canApplyReservationCommand('confirmed', 'cancel'), true);
  assert.equal(canApplyReservationCommand('confirmed', 'confirm'), false);

  assert.deepEqual(allowedCommands(RESERVATION_MACHINE, 'requested'), ['confirm', 'cancel']);
  assert.deepEqual(allowedCommands(RESERVATION_MACHINE, 'confirmed'), ['cancel']);
  assert.deepEqual(allowedCommands(RESERVATION_MACHINE, 'cancelled'), []);

  console.log('stateMachine.test.ts: ok');
}

run();
