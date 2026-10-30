/**
 * 层级字号（原版 `fontSetHierarych`）
 *
 * 三块：预设下拉（含重命名 / 删除）→ 6 级字号按钮（点一下应用到图层）→ 编辑器（改完存预设）。
 *
 * 编辑器里的输入是**草稿**：只在失焦 / Enter / 保存时写回设置，
 * 否则每敲一个数字都会落盘一次（`sj_set.json` 会被写成几十次）。
 *
 * 6 级是硬约束（`validateLevels`），这里不做「少一级也能用」的兜底。
 */

import { useState } from 'react';
import { IconButton } from '../../../components/IconButton';
import { InputDialog } from '../../../components/InputDialog';
import { SelectBox } from '../../../components/SelectBox';
import { Input } from '../../../components/ui';
import type { HierarchyPreset } from '../../../domain/font-set';
import { useDraft } from '../../../hooks/useDraft';
import { HIERARCHY_TITLES } from '../font-panel-constants';

interface Props {
  levels: number[];
  presets: HierarchyPreset[];
  presetIndex: number;
  onApplyLevel: (value: number) => void;
  onUpdateLevels: (levels: number[]) => void;
  onSelectPreset: (index: number) => void;
  onSavePreset: (levels: number[]) => void;
  onCreatePreset: (name: string, levels: number[]) => void;
  onRenamePreset: (index: number, name: string) => void;
  onDeletePreset: (index: number) => void;
}

type NameMode = { kind: 'rename' } | { kind: 'create' } | null;

export function FontHierarchy({
  levels,
  presets,
  presetIndex,
  onApplyLevel,
  onUpdateLevels,
  onSelectPreset,
  onSavePreset,
  onCreatePreset,
  onRenamePreset,
  onDeletePreset
}: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [nameMode, setNameMode] = useState<NameMode>(null);

  /**
   * 层级内容变了才重填草稿（切预设 / 保存后回读）：比较的是 `join(',')` 的内容，
   * 所以父级每次渲染传新数组也不会冲掉用户输入（规则在 `hooks/useDraft`）。
   */
  const { draft: draftText, setDraft } = useDraft(levels.join(','), (joined) =>
    joined ? joined.split(',') : []
  );

  /** 草稿 → 数字：输入框留空或非数字时保留该级原值，不提交 0 */
  function draftLevels(): number[] {
    return draftText.map((text, index) => {
      const parsed = Number(text);
      return Number.isFinite(parsed) ? parsed : (levels[index] ?? 0);
    });
  }

  /** 失焦 / Enter：只写回设置，不碰预设 */
  function commitDraft(): number[] {
    const next = draftLevels();
    onUpdateLevels(next);
    return next;
  }

  const current = presets[presetIndex];

  return (
    <div className="mm-font-panel__hierarchy">
      <div className="mm-u-row mm-font-panel__row mm-font-panel__hierarchy-row">
        <SelectBox
          className="mm-u-grow mm-font-panel__hierarchy-select"
          options={presets.map((preset, index) => ({
            value: String(index),
            label: preset.name
          }))}
          value={String(presetIndex)}
          onChange={(value) => onSelectPreset(Number(value))}
        />

        <IconButton
          className="mm-icon-btn--inline"
          name="iconshuru"
          title="重命名预设"
          disabled={nameMode !== null || presets.length === 0}
          onClick={() => setNameMode({ kind: 'rename' })}
        />
        <IconButton
          className="mm-icon-btn--inline"
          name="iconshanchu"
          title="删除预设"
          disabled={presets.length <= 1}
          onClick={() => onDeletePreset(presetIndex)}
        />
        <IconButton
          name="iconchangguicengjiyushe"
          title="设置层级预设"
          className="mm-icon-btn--inline"
          active={editorOpen}
          onClick={() => setEditorOpen((open) => !open)}
        />
      </div>

      <div className="mm-font-panel__levels">
        {levels.map((level, index) => (
          <button
            key={`${HIERARCHY_TITLES[index] ?? index}`}
            type="button"
            className="mm-btn mm-btn--numeric mm-font-panel__level"
            title={HIERARCHY_TITLES[index] ?? ''}
            onClick={() => onApplyLevel(level)}
          >
            {level}
          </button>
        ))}
      </div>

      {editorOpen ? (
        <div className="mm-font-panel__editor">
          <div className="mm-font-panel__editor-row">
            {draftText.map((text, index) => (
              <Input
                key={`level-input-${index}`}
                variant="page"
                className="mm-font-panel__editor-input"
                type="text"
                inputMode="decimal"
                title={HIERARCHY_TITLES[index] ?? ''}
                value={text}
                onChange={(event) =>
                  setDraft((current) => {
                    const next = [...current];
                    next[index] = event.target.value;
                    return next;
                  })
                }
                onBlur={() => {
                  commitDraft();
                }}
              />
            ))}
          </div>

          <div className="mm-u-row mm-font-panel__editor-actions">
            <button
              type="button"
              className="mm-btn mm-btn--numeric mm-font-panel__preset-btn mm-font-panel__preset-btn--half"
              title="替换当前层级"
              /* 保存到预设自己会写回层级，不再先 commitDraft（否则同一份值写两次盘） */
              onClick={() => onSavePreset(draftLevels())}
            >
              保存到预设
            </button>
            <button
              type="button"
              className="mm-btn mm-btn--numeric mm-font-panel__preset-btn mm-font-panel__preset-btn--half"
              title="保存到新预设"
              onClick={() => setNameMode({ kind: 'create' })}
            >
              新建预设
            </button>
          </div>
        </div>
      ) : null}

      {nameMode ? (
        <InputDialog
          title={nameMode.kind === 'rename' ? '请输入新的名字' : '请输入层级名字'}
          defaultValue={nameMode.kind === 'rename' ? (current?.name ?? '') : ''}
          onSubmit={(name) => {
            if (nameMode.kind === 'rename') onRenamePreset(presetIndex, name);
            else onCreatePreset(name, commitDraft());
            setNameMode(null);
          }}
          onClose={() => setNameMode(null)}
        />
      ) : null}
    </div>
  );
}
