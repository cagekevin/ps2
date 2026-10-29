/**
 * 【唯一入口】空态 / 失败提示 —— 全仓只许这一处；页面与 feature 一律 import 这里，禁止在别处再写一份。
 *
 * 【范本】空态 / 读取失败提示。
 *
 * 全项目唯一入口：页面不要自己拼「文件不存在」「读取失败」文案。
 * 码决定说什么，重试只给环境问题（`IO_ERROR`），不把 bug 伪装成可重试。
 *
 * 两种用法是两支类型，不能同时传：`result` 是「读取失败」，`empty` 是「本来就没有」。
 * 同时传曾会静默丢掉失败原因（`empty` 先返回），所以没有 `result?` / `empty?` 这种可选组合。
 */
import type { Result } from '../../types/result';
import './state-hint.css';

/** 读取失败：码决定文案，`onRetry` 只在 `IO_ERROR` 时出现 */
type FailureProps = { result: Result<unknown>; onRetry?: () => void };

/** 空态：本来就没有数据，不是失败 */
type EmptyProps = { empty: string };

type Props = FailureProps | EmptyProps;

export function StateHint(props: Props) {
  if ('empty' in props) return <div className="mm-u-row mm-state-hint">{props.empty}</div>;

  const { result, onRetry } = props;
  if (result.status === 'ok') return null;

  /*
   * `NOT_FOUND` **不再改写成「文件不存在」**：生产者的 reason 往往更准
   *（「文件夹内没有PSD文件」「索引里没有登记这个库的文件名」），
   * 统一改成「文件不存在」等于替生产者改口径。只有 reason 为空时才回落。
   */
  if (result.code === 'NOT_FOUND') {
    return <div className="mm-u-row mm-state-hint">{result.reason || '文件不存在'}</div>;
  }

  /*
   * 前提不满足不是故障：没打开文档 / 当前图层类型不对（文字、形状、智能对象…），
   * 都是「换一下就好」的提示。标红会让人以为面板坏了，而这两个码的文案
   * 本来就说得清当前是什么、需要什么。
   */
  if (result.code === 'PS_NO_DOC' || result.code === 'PS_WRONG_LAYER') {
    return <div className="mm-u-row mm-state-hint">{result.reason}</div>;
  }

  if (result.code === 'CORRUPT') {
    /* detail 是机器现场（哪个字段、期望什么）：不进正文，挂 title 让它可查 */
    return (
      <div className="mm-u-row mm-state-hint mm-state-hint--error" title={result.detail || undefined}>
        数据异常：{result.reason}
      </div>
    );
  }

  if (result.code === 'IO_ERROR') {
    return (
      <div className="mm-u-row mm-state-hint mm-state-hint--error" title={result.detail || undefined}>
        读取失败：{result.reason}
        <button type="button" className="mm-state-hint__retry" onClick={onRetry}>
          重试
        </button>
      </div>
    );
  }

  /* 其余码不该出现在读取链路；如实显示原因，不给重试 */
  return <div className="mm-u-row mm-state-hint mm-state-hint--error">{result.reason}</div>;
}
