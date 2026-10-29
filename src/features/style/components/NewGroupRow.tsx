/**
 * 新建分组的占位行：只渲染输入框，提交后由父级写库。
 *
 * 用 `GroupHead` 的 `titleSlot`（就地编辑态）：箭头 + 输入框那一行与分组头同形，
 * 自己拼一份就是第三种写法（`Collapse` 删除时曾漏掉这里）。
 */
import { GroupHead } from '../../../components/GroupHead';
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
      <GroupHead
        title="新建分组"
        open={false}
        onToggle={() => undefined}
        titleSlot={<InlineEdit value="新建分组" onCommit={onCommit} onCancel={onCancel} />}
      />
    </div>
  );
}
