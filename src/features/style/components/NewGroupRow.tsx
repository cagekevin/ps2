/** 新建分组的占位行：只渲染输入框，提交后由父级写库 */
import { Chevron } from '../../../components/Chevron';
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
        {/* 箭头用 `Chevron`：文本字符随系统字体变化，且原版靠 rotate 表示收起（style 页其它组头同款） */}
        <Chevron open={false} size={9} />
        <InlineEdit value="新建分组" onCommit={onCommit} onCancel={onCancel} />
      </div>
    </div>
  );
}
