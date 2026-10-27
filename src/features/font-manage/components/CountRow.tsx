/** 计数行：全部(259) / 标签名(12)，单独一行位于标签与列表之间 */
interface Props {
  text: string;
  activeTag: string;
  onClear: () => void;
}

export function CountRow({ text, activeTag, onClear }: Props) {
  return (
    <div className="mm-font__list-head">
      <span className="mm-font__list-count">{text}</span>
      {activeTag ? (
        <button className="mm-font__clear-tag" type="button" onClick={onClear}>
          取消筛选
        </button>
      ) : null}
    </div>
  );
}
