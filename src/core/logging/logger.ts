/**
 * Moa-v2 Central Logging and Observability Utility
 * 
 * 아키텍처 원칙:
 * - Core 계층에 위치하며, 업종 중립적이고 경량화된 로깅 인프라를 제공한다.
 * - 네임스페이스 기반의 태그 [Namespace] 로깅을 지원한다.
 * - 민감한 개인정보/인증정보(password, token, secret, apiKey 등)의 자동 마스킹을 수행한다.
 * - 프로덕션 환경에서 디버그 로그를 제어하고 외부 APM/에러 트래커 연동을 위한 핸들러 훅을 제공한다.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

export interface LogEntry {
  level: LogLevel;
  namespace: string;
  message: string;
  args: unknown[];
  timestamp: string;
}

export type LogHandler = (entry: LogEntry) => void;

let currentGlobalLevel: LogLevel =
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'
    ? 'warn'
    : 'debug';

const logHandlers: Set<LogHandler> = new Set();

const SENSITIVE_KEY_PATTERN = /(password|token|secret|api_?key|auth|bearer|credentials)/i;

/**
 * 객체 내 민감한 키(패스워드, 토큰, 시크릿 등)를 재귀적으로 [REDACTED] 처리한다.
 */
export function maskSensitiveData(data: unknown, depth = 0): unknown {
  if (depth > 4) return '[Truncated]';
  if (!data || typeof data !== 'object') return data;
  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: data.stack,
    };
  }
  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item, depth + 1));
  }
  const masked: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      masked[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      masked[key] = maskSensitiveData(val, depth + 1);
    } else {
      masked[key] = val;
    }
  }
  return masked;
}

export function setLogLevel(level: LogLevel): void {
  currentGlobalLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentGlobalLevel;
}

export function addLogHandler(handler: LogHandler): () => void {
  logHandlers.add(handler);
  return () => {
    logHandlers.delete(handler);
  };
}

export function clearLogHandlers(): void {
  logHandlers.clear();
}

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

export function createLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`;

  const logAt = (level: LogLevel, message: string, ...args: unknown[]) => {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[currentGlobalLevel]) {
      return;
    }

    const sanitizedArgs = args.map((arg) => maskSensitiveData(arg));
    const entry: LogEntry = {
      level,
      namespace,
      message,
      args: sanitizedArgs,
      timestamp: new Date().toISOString(),
    };

    // 외부 옵저버빌리티 리스너 전달
    for (const handler of logHandlers) {
      try {
        handler(entry);
      } catch (err) {
        // 핸들러 에러가 로깅 본체를 중단시키지 않음
      }
    }

    // 콘솔 출력
    switch (level) {
      case 'debug':
        console.debug(prefix, message, ...sanitizedArgs);
        break;
      case 'info':
        console.info(prefix, message, ...sanitizedArgs);
        break;
      case 'warn':
        console.warn(prefix, message, ...sanitizedArgs);
        break;
      case 'error':
        console.error(prefix, message, ...sanitizedArgs);
        break;
      default:
        break;
    }
  };

  return {
    debug: (message: string, ...args: unknown[]) => logAt('debug', message, ...args),
    info: (message: string, ...args: unknown[]) => logAt('info', message, ...args),
    warn: (message: string, ...args: unknown[]) => logAt('warn', message, ...args),
    error: (message: string, ...args: unknown[]) => logAt('error', message, ...args),
  };
}

/** 시스템 공통 기본 로거 */
export const logger = createLogger('App');
