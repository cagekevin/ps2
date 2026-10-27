/** 新建分组的占位行：只渲染输入框，提交后由父级写库 */
import { InlineEdit } from '../../../components/InlineEdit';

export function NewGroupRow({
  onCommit,
  onCancel
}: {
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="mm-style__group">
      <div className="mm-style__group-head">
        <span className="mm-style__caret">▸</span>
        <InlineEdit value="新建分组" onCommit={onCommit} onCancel={onCancel} />
      </div>
    </div>
  );
}
