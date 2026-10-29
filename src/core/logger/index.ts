/**
 * 【范本】日志
 * 控制台 + %TEMP%\maomao.log。
 * 脱敏在内部完成，调用方无需关心，直接把上下文丢进来即可。
 * 读写日志文件走 core/cep/node，不用 window.cep.fs。
 */

import { MSG } from '../../types/messages';
import { failWithDetail, ok, type Result } from '../../types/result';
import { nodeRequire } from '../cep/node';

type Level = 'info' | 'warn' | 'error';

const PREFIX = '[maomao]';
const LOG_FILE = 'maomao.log';

const SENSITIVE_KEY = /token|authorization|password|secret|cookie|key/i;
const SENSITIVE_TEXT = [
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /"(access_token|refresh_token|password|secret)"\s*:\s*"[^"]*"/gi
];

interface NodeFs {
  appendFileSync(path: string, data: string): void;
  readFileSync(path: string, encoding: 'utf8'): string;
  writeFileSync(path: string, data: string, encoding: 'utf8'): void;
  existsSync(path: string): boolean;
}

interface NodeOs {
  tmpdir(): string;
}

interface NodePath {
  join(...parts: string[]): string;
}

function logPath(): string | null {
  const os = nodeRequire<NodeOs>('os');
  const path = nodeRequire<NodePath>('path');
  if (!os || !path) return null;
  try {
    return path.join(os.tmpdir(), LOG_FILE);
  } catch {
    return null;
  }
}

function maskText(text: string): string {
  return SENSITIVE_TEXT.reduce(
    (acc, pattern) =>
      acc.replace(pattern, (matched) => {
        const key = /^"([^"]+)"/.exec(matched)?.[1];
        return key ? `"${key}":"***"` : 'Bearer ***';
      }),
    text
  );
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]';
  if (typeof value === 'string') return maskText(value);
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEY.test(key) ? '***' : sanitize(item, depth + 1);
  }
  return result;
}

function toText(value: unknown): string {
  if (typeof value === 'string') return maskText(value);
  try {
    return JSON.stringify(sanitize(value));
  } catch {
    return String(value);
  }
}

function appendToFile(line: string): void {
  const fs = nodeRequire<NodeFs>('fs');
  const file = logPath();
  if (!fs || !file) return;
  try {
    fs.appendFileSync(file, `${line}\n`);
  } catch {
    /* 日志失败不影响业务 */
  }
}

/**
 * 相同消息的折叠窗口。
 *
 * 图层轮询每 800ms 打一条，几分钟就是几千行，把真正有用的信息淹掉。
 * 这里按「级别 + 消息」折叠：窗口内只写第一条，后续计数，
 * 窗口过去后补一句「(+N 条相同消息已折叠)」。
 *
 * error 不折叠——报错每次都要看见。
 */
const DEDUPE_MS = 3000;
const DEDUPE_MAX_KEYS = 200;
const recent = new Map<string, { at: number; count: number }>();

/** 返回 null 表示这次丢弃；返回数字表示上次以来被折叠的条数 */
function checkDedupe(level: Level, message: string): number | null {
  const key = `${level}|${message}`;
  const now = Date.now();
  const last = recent.get(key);

  if (last && now - last.at < DEDUPE_MS) {
    last.count += 1;
    return null;
  }

  const skipped = last?.count ?? 0;
  recent.set(key, { at: now, count: 0 });
  if (recent.size > DEDUPE_MAX_KEYS) recent.clear();
  return skipped;
}

function write(level: Level, message: string, context?: unknown): void {
  const skipped = level === 'error' ? 0 : checkDedupe(level, message);
  if (skipped === null) return;

  const folded = skipped > 0 ? ` (+${skipped} 条相同消息已折叠)` : '';
  const suffix = context === undefined ? '' : ` ${toText(context)}`;
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${maskText(message)}${folded}${suffix}`;

  if (level === 'error') console.error(PREFIX, line);
  else if (level === 'warn') console.warn(PREFIX, line);
  else console.log(PREFIX, line);

  appendToFile(line);
}

export const log = {
  info: (message: string, context?: unknown) => write('info', message, context),
  warn: (message: string, context?: unknown) => write('warn', message, context),
  error: (message: string, context?: unknown) => write('error', message, context)
};

/** 读取日志全文，供诊断页显示 */
export function readLogText(): string {
  const fs = nodeRequire<NodeFs>('fs');
  const file = logPath();
  if (!fs || !file) return '';
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

/**
 * 清空日志文件（诊断页「清空」用）。
 *
 * 与 `readLogText` 不同，这里必须返回 `Result`：读失败顶多显示空，清空失败却要
 * 让用户知道「日志还在」——静默失败会让下一次排障拿到上一次的旧日志。
 * 文件不存在时写一个空文件，等同成功（用户要的结果就是没有日志）。
 */
export function clearLogText(): Result<void> {
  const fs = nodeRequire<NodeFs>('fs');
  const file = logPath();
  if (!fs || !file) return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, 'log:fs:false');
  try {
    fs.writeFileSync(file, '', 'utf8');
    /* 折叠窗口也要一起清：否则清空后 3 秒内复现同一个问题，第一行会被当成「重复」吞掉 */
    recent.clear();
    return ok(undefined);
  } catch (error) {
    return failWithDetail('IO_ERROR', MSG.codeReason.IO_ERROR, `clear:${file} ${String(error)}`);
  }
}
