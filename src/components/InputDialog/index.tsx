/**
 * 【范本】输入弹窗（原版全局 `$inputBox`）
 *
 * 原版同一个组件被两处复用，行为完全一致，所以这里是公共件而不是各页面各写一个：
 *   分布弹窗（`app.v4.js:1321235` 的 `input-box` 模板）
 *   层级预设的重命名 / 新建（`:1341750` `$inputBox.show(cb, "请输入新的名字")`）
 *
 * 结构与尺寸照原版 `.input-box` / `.input-box-main`（`app.bf68b505.css`）：
 * 遮罩 `rgba(0,0,0,.1)` + `z-index:1001`；面板 `fixed`、`left:calc(50vw - 90px)`、
 * `top:30%`、宽 220、内边距 15/20——**不是屏幕居中**，改之前先看原版。
 *
 * 三条行为：
 *   1. 空值不许提交（原版文案「不能输入空字符」）
 *   2. Enter 提交；输入法选词的 Enter 不算（`hooks/input-method-enter`）
 *   3. 点遮罩 = 取消；**Esc 不关**（原版行为，不要顺手加）
 *
 * 焦点：打开时聚焦并全选输入框，Tab 只在弹窗内循环，关掉后回到触发它的按钮
 * （`hooks/useFocusTrap`）。原版没有陷阱与还原，这两条是**有意的可访问性补强**。
 */

import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { enterSubmit } from '../../hooks/input-method-enter';
import { Input, stopClickPropagation } from '../ui';
import './input-dialog.css';

interface Props {
  /** 面板标题（原版第二个参数，如「请输入新的名字」） */
  title: string;
  defaultValue?: string;
  /** 右上角附加按钮（分布弹窗的「固定弹窗」） */
  extraHeader?: React.ReactNode;
  /** 输入框下方的附加内容（分布弹窗的「高级用法」） */
  extra?: React.ReactNode;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

export function InputDialog({
  title,
  defaultValue = '',
  extraHeader,
  extra,
  onSubmit,
  onClose
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  /* 焦点陷阱与关闭还原走公共 hook（原版没有这两条，属可访问性补强，Esc 仍然不关） */
  const { containerRef, onKeyDown } = useFocusTrap();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function submit(): void {
    const text = value.trim();
    if (!text) {
      setError('不能输入空字符');
      return;
    }
    setError('');
    onSubmit(text);
  }

  return (
    <div className="mm-input-dialog" onClick={onClose}>
      <div
        ref={containerRef}
        className="mm-input-dialog__main"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={stopClickPropagation}
        onKeyDown={onKeyDown}
      >
        <div className="mm-input-dialog__head">
          <span className="mm-input-dialog__title">{title}</span>
          <span className="mm-input-dialog__grow" />
          {extraHeader}
        </div>

        <Input
          ref={inputRef}
          variant="page"
          className="mm-input-dialog__input"
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError('');
          }}
          onKeyDown={enterSubmit(submit)}
        />

        {error ? <p className="mm-input-dialog__error">{error}</p> : null}
        {extra}

        <div className="mm-input-dialog__footer">
          <button type="button" className="mm-input-dialog__ok" onClick={submit}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
