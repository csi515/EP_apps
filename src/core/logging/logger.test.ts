/**
 * Central Logger & Observability Unit Tests
 * 
 * 실행: npx tsx src/core/logging/logger.test.ts
 */

import assert from 'node:assert/strict';
import {
  createLogger,
  setLogLevel,
  getLogLevel,
  addLogHandler,
  clearLogHandlers,
  maskSensitiveData,
  type LogEntry,
} from './logger';

function runLoggerTests() {
  console.log('Running central logger unit tests...');

  // 1. 민감 정보 마스킹 검증 (maskSensitiveData)
  const rawPayload = {
    userId: 'user-123',
    password: 'super-secret-password',
    authToken: 'eyJhbGciOiJIUzI1Ni...',
    apiKey: 'sk-123456789',
    nested: {
      clientSecret: 'secret-val',
      publicInfo: 'visible',
    },
    list: [
      { bearer: 'token-abc' },
      { normal: 'value' },
    ],
  };

  const masked = maskSensitiveData(rawPayload) as any;
  assert.equal(masked.userId, 'user-123');
  assert.equal(masked.password, '[REDACTED]');
  assert.equal(masked.authToken, '[REDACTED]');
  assert.equal(masked.apiKey, '[REDACTED]');
  assert.equal(masked.nested.clientSecret, '[REDACTED]');
  assert.equal(masked.nested.publicInfo, 'visible');
  assert.equal(masked.list[0].bearer, '[REDACTED]');
  assert.equal(masked.list[1].normal, 'value');

  // Error 객체 마스킹
  const testError = new Error('Database connection failed');
  const maskedError = maskSensitiveData(testError) as any;
  assert.equal(maskedError.name, 'Error');
  assert.equal(maskedError.message, 'Database connection failed');

  // 2. 로그 레벨 설정 및 필터링 검증
  const originalLevel = getLogLevel();
  setLogLevel('debug');
  assert.equal(getLogLevel(), 'debug');

  const logs: LogEntry[] = [];
  const unsubscribe = addLogHandler((entry) => {
    logs.push(entry);
  });

  const testLogger = createLogger('TestModule');
  testLogger.debug('Debug message', { password: 'raw' });
  testLogger.info('Info message');
  testLogger.warn('Warning message');
  testLogger.error('Error message');

  assert.equal(logs.length, 4);
  assert.equal(logs[0].level, 'debug');
  assert.equal(logs[0].namespace, 'TestModule');
  assert.equal(logs[0].message, 'Debug message');
  assert.deepEqual(logs[0].args, [{ password: '[REDACTED]' }]);

  // 레벨을 warn으로 올렸을 때 info/debug 필터링
  logs.length = 0;
  setLogLevel('warn');
  testLogger.debug('Should not be logged');
  testLogger.info('Should not be logged');
  testLogger.warn('Should be logged');
  testLogger.error('Should be logged');

  assert.equal(logs.length, 2);
  assert.equal(logs[0].level, 'warn');
  assert.equal(logs[1].level, 'error');

  // 3. 핸들러 구독 해제 검증
  unsubscribe();
  logs.length = 0;
  testLogger.error('Unsubscribed message');
  assert.equal(logs.length, 0, '핸들러 해제 후에는 로그가 전달되지 않아야 함');

  // 정리
  clearLogHandlers();
  setLogLevel(originalLevel);

  console.log('logger.test.ts: ok (central logger assertions passed successfully)');
}

runLoggerTests();
