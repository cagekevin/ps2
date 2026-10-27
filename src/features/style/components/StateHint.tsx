/** 读取失败提示：码决定说什么，重试只给环境问题（IO_ERROR），不把 bug 伪装成可重试 */
import type { Result } from '../../../types/result';

export function StateHint({
  result,
  onRetry
}: {
  result: Result<unknown>;
  onRetry: () => void;
}) {
  if (result.status === 'ok') return null;

  if (result.code === 'NOT_FOUND') {
    return <p className="mm-style__hint">索引里登记了这个库，但文件不存在</p>;
  }

  if (result.code === 'CORRUPT') {
    return <p className="mm-style__hint mm-style__hint--error">数据异常：{result.reason}</p>;
  }

  if (result.code === 'IO_ERROR') {
    return (
      <p className="mm-style__hint mm-style__hint--error">
        读取失败：{result.reason}
        <button type="button" className="mm-style__retry" onClick={onRetry}>
          重试
        </button>
      </p>
    );
  }

  /* 其余码不该出现在读取链路；万一出现，如实显示原因，不给重试 */
  return <p className="mm-style__hint mm-style__hint--error">{result.reason}</p>;
}
