/**
 * 【唯一入口】页面消息行 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】页面状态提示（常驻、零位移）
 *
 * 每页底部一条常驻消息行，本页全部状态话的唯一出口：前提不满足、空态、数据健康、
 * 读取失败都收敛到这一行。常驻是零位移的根：行高锁死、始终占位，有话写字、没话留白，
 * 出现 / 消失都不挤动上方内容（StateHint 条件渲染挤动下文的收口，见 `TD-08-2`）。
 *
 * 三档文字色（`2026-11-04` 比稿定稿，`mockups` 已删）：
 *   info  灰 faint  —— 前提不满足（换一下就好）/ 空态
 *   warn  黄 warn   —— 数据健康（降级显示、部分丢弃），页面照常可用
 *   error 红 danger —— 读取失败；`onRetry` 只在 `IO_ERROR` 时出现，不把 bug 伪装成可重试
 *
 * 分工边界：操作回执归 toast（`useToast`），页面状态话归这里——一行状态不该用会消失的浮层说。
 */
import type { Result } from '../../types/result';
import './message-bar.css';

/** 消息档位：info=前提 / 空态（灰）、warn=数据健康（黄）、error=读取失败（红） */
export type MessageKind = 'info' | 'warn' | 'error';

/** 一条要显示在消息行的话；action 是行内可点动作（重试 / 清除筛选） */
export type MessageItem = {
  kind: MessageKind;
  text: string;
  /** 机器现场：不进正文，挂 title 可查 */
  title?: string;
  action?: { label: string; onClick: () => void };
};

/** 读取失败 → 消息行的标准转换：只转发 `reason` 不造句，码决定档位；null（无失败）直通 */
export function failureMessage(result: Result<unknown> | null, onRetry?: () => void): MessageItem | null {
  if (result === null || result.status === 'ok') return null;

  /*
   * 前提不满足不是故障：没打开文档 / 当前图层类型不对 / 文件本来就没有 ——
   * 都是「换一下就好」的提示，标红会让人以为面板坏了。
   */
  const soft = result.code === 'NOT_FOUND' || result.code === 'PS_NO_DOC' || result.code === 'PS_WRONG_LAYER';

  return {
    kind: soft ? 'info' : 'error',
    text: result.reason,
    title: soft ? undefined : result.detail || undefined,
    action: result.code === 'IO_ERROR' && onRetry ? { label: '重试', onClick: onRetry } : undefined,
  };
}

/** 多条消息合成一条：error > warn > info，同级用「；」连接；全文挂 title 兜底截断 */
export function mergeMessages(items: Array<MessageItem | null | false>): MessageItem | null {
  const list = items.filter((item): item is MessageItem => Boolean(item));
  if (!list.length) return null;

  // 档位取最高：error > warn > info（不用下标查表——noUncheckedIndexedAccess 下索引访问会带 undefined）
  const top: MessageKind = list.some((item) => item.kind === 'error')
    ? 'error'
    : list.some((item) => item.kind === 'warn')
      ? 'warn'
      : 'info';
  const picked = list.filter((item) => item.kind === top);
  const text = picked.map((item) => item.text).join('；');

  return {
    kind: top,
    text,
    title: picked.some((item) => item.title) ? text : undefined,
    action: picked.find((item) => item.action)?.action,
  };
}

export function MessageBar({ message }: { message: MessageItem | null }) {
  return (
    <div className="mm-message-bar" role="status">
      {message ? (
        <span
          className={`mm-message-bar__msg${message.kind === 'info' ? '' : ` mm-message-bar__msg--${message.kind}`}`}
          title={message.title}
        >
          {message.text}
        </span>
      ) : null}
      {message?.action ? (
        <button type="button" className="mm-message-bar__action" onClick={message.action.onClick}>
          {message.action.label}
        </button>
      ) : null}
    </div>
  );
}
