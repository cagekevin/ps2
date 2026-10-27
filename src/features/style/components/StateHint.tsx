/** 三态提示：missing / corrupt / unreadable 各说各的原因，不合并成「加载失败」 */
import type { ReadOutcome } from '../../../types/read';

export function StateHint({
  outcome,
  onRetry
}: {
  outcome: ReadOutcome<unknown>;
  onRetry: () => void;
}) {
  if (outcome.status === 'ok') return null;

  if (outcome.status === 'missing') {
    return <p className="mm-style__hint">索引里登记了这个库，但文件不存在</p>;
  }

  if (outcome.status === 'corrupt') {
    return <p className="mm-style__hint mm-style__hint--error">数据异常：{outcome.reason}</p>;
  }

  return (
    <p className="mm-style__hint mm-style__hint--error">
      读取失败：{outcome.reason}
      <button type="button" className="mm-style__retry" onClick={onRetry}>
        重试
      </button>
    </p>
  );
}
