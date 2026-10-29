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
   * **只转发，不造句**：这里的字就是生产者给的 `reason`。
   * 不再按码改写（原先 `NOT_FOUND → '文件不存在'`）、不再加「数据异常：」帽子、
   * 也不再查表补字 —— 补字等于消费者替生产者说话。生产者（含 `core`）必须从
   * `types/messages.ts` 取句子填进 `reason`。
   */
  const text = result.reason;

  /*
   * 前提不满足不是故障：没打开文档 / 当前图层类型不对 / 文件本来就没有 ——
   * 都是「换一下就好」的提示，标红会让人以为面板坏了。
   */
  const soft = result.code === 'NOT_FOUND' || result.code === 'PS_NO_DOC' || result.code === 'PS_WRONG_LAYER';

  if (soft) return <div className="mm-u-row mm-state-hint">{text}</div>;

  /* `detail` 是机器现场：不进正文，挂 title 让它可查；重试只给环境问题 */
  return (
    <div className="mm-u-row mm-state-hint mm-state-hint--error" title={result.detail || undefined}>
      {text}
      {result.code === 'IO_ERROR' ? (
        <button type="button" className="mm-state-hint__retry" onClick={onRetry}>
          重试
        </button>
      ) : null}
    </div>
  );
}
