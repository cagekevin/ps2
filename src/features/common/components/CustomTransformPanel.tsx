/**
 * 自定义变换面板（原版 `comcustomChange`，`app.v4.js:36062`）。
 *
 * 6 个输入（3 行 × 2）+ 九宫格锚点 + 两个按钮，逐字照 `13-常用-V2` §1.1-D。
 *
 * 三条与原版对齐、不要「优化」的地方：
 *   1. **参数顺序**由 `commands.customBuildTransform` 按具名字段拼（官方 7 位），面板只管取值；
 *   2. **校验 4 条在面板内拦**（返回前不调命令），文案是官方逐字，属「操作不成立」类提示，
 *      不是命令失败，所以走 `toast.error` 而不是 `Result`；
 *   3. **左右 / 上下不补单位**（偏离 A-2）：原版 `blur` 调 `ft.b` 补单位，本仓没有那个移植，
 *      原样传，真机若不生效先按 `0px` 复验。
 *
 * 遮罩只在 `number > 5` 时出（官方同款），文案「正在处理...」。
 */

import { useState } from 'react';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/ui';
import { customBuildTransform } from '../../../commands/common-use';
import { MSG } from '../../../types/messages';
import { useRunCommand } from '../../../hooks/useRunCommand';
import { useToast } from '../../../hooks/useToast';
import type { IconName } from '../../../components/icons';
import { AnchorGrid } from './AnchorGrid';
import './panel.css';

/** 一个输入位的静态配置：字段 / 图标 / 提示（顺序即官方 6 个输入的顺序） */
const FIELDS: ReadonlyArray<{ key: FieldKey; icon: IconName; title: string; digits: boolean }> = [
  { key: 'number', icon: 'iconfuzhishuliang', title: '复制数量', digits: true },
  { key: 'scale', icon: 'iconsuofangbili', title: '缩放比例', digits: true },
  { key: 'leftRigth', icon: 'iconzuoyoujuli-1', title: '左右距离', digits: false },
  { key: 'topBottom', icon: 'iconzuoyoujuli', title: '上下距离', digits: false },
  { key: 'angle', icon: 'iconxuanzhuanjiaodu', title: '旋转角度', digits: true },
  { key: 'opacity', icon: 'icontoumingdudijian', title: '透明度递减', digits: true }
];

type FieldKey = 'number' | 'scale' | 'leftRigth' | 'topBottom' | 'angle' | 'opacity';

type Draft = Record<FieldKey, string>;

const EMPTY: Draft = { number: '', scale: '', leftRigth: '', topBottom: '', angle: '', opacity: '' };

/** 非数字（逐键过滤用）。模块级常量：输入框每敲一键都 new 一个 RegExp 是白费 */
const NON_DIGIT = /[^\d]/g;

/** 原版 `keyup` 的「只留数字」：数字类输入逐键过滤，距离类保留原文 */
function digitsOnly(value: string): string {
  return value.replace(NON_DIGIT, '');
}

/* 3 行 × 2 个输入：静态分组，模块级算一次（放组件里每次渲染都会重建数组） */
const FIELD_ROWS = Array.from({ length: Math.ceil(FIELDS.length / 2) }, (_, row) =>
  FIELDS.slice(row * 2, row * 2 + 2)
);

export function CustomTransformPanel() {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  /* 官方默认锚点 0（`:36277` 的 `pointIdex: 0`） */
  const [anchor, setAnchor] = useState(0);
  const run = useRunCommand();
  const toast = useToast();

  function update(key: FieldKey, value: string, digits: boolean): void {
    setDraft((current) => ({ ...current, [key]: digits ? digitsOnly(value) : value }));
  }

  function reset(): void {
    setDraft(EMPTY);
    setAnchor(0);
  }

  function submit(): void {
    /* 官方校验顺序与文案，逐字照抄 */
    if (!draft.number.trim()) {
      toast.error(MSG.common.needCopyCountInput);
      return;
    }

    const number = Number(draft.number);
    const scale = draft.scale.trim() === '' ? 100 : Number(draft.scale);
    const angle = draft.angle.trim() === '' ? 0 : Number(draft.angle);
    const opacity = draft.opacity.trim() === '' ? 0 : Number(draft.opacity);

    if (scale <= 0) {
      toast.error(MSG.common.ratioMin);
      return;
    }
    if (scale > 9999) {
      toast.error(MSG.common.ratioMax);
      return;
    }
    if (number < 1) {
      toast.error(MSG.common.countMin);
      return;
    }
    if (opacity > 99) {
      toast.error(MSG.common.opacityMax);
      return;
    }

    void run(
      () =>
        customBuildTransform({
          number,
          scale,
          angle,
          opacity,
          pointIndex: anchor as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
          /* 空值兜底是官方文案里的「0px」，不是本仓新造的默认 */
          leftRigth: draft.leftRigth.trim() || '0px',
          topBottom: draft.topBottom.trim() || '0px'
        }),
      /* 数量 > 5 才值得出遮罩（官方同款） */
      number > 5 ? { tip: MSG.common.progressProcessing } : { spin: false }
    );
  }

  return (
    <div className="mm-common__panel">
      {FIELD_ROWS.map((row) => (
        <div className="mm-u-row mm-common__panel-row" key={row[0]?.key}>
          {row.map((field) => (
            <TextField
              key={field.key}
              variant="half"
              title={field.title}
              placeholder={field.title}
              icon={field.icon}
              inputMode={field.digits ? 'decimal' : 'text'}
              value={draft[field.key]}
              onChange={(value) => update(field.key, value, field.digits)}
            />
          ))}
        </div>
      ))}

      <AnchorGrid value={anchor} onChange={setAnchor} />

      <div className="mm-common__panel-rule" />

      <div className="mm-btn-grid mm-common__panel-row--pair">
        <Button className="mm-common__panel-btn" onClick={submit}>
          生成变换
        </Button>
        <Button className="mm-common__panel-btn" onClick={reset}>
          重置参数
        </Button>
      </div>
    </div>
  );
}
