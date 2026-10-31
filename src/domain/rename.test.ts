import { describe, expect, it } from 'vitest';
import {
  HISTORY_LIMIT,
  RECENT_GROUP_NAME,
  addGroupAt,
  addItemAt,
  buildReplaceExpression,
  changeItemAt,
  checkExpression,
  clearMarks,
  decodeRenamePreset,
  deleteGroupAt,
  deleteItemAt,
  insertMark,
  isGroupEditable,
  isLayerColorIndex,
  parsePreset,
  pushHistory,
  renameGroupAt,
  seedPreset,
  serializePreset,
  withGroupMoved,
  withItemMoved,
  type RenamePreset
} from './rename';

function preset(): RenamePreset {
  return [
    { name: RECENT_GROUP_NAME, show: false, list: ['%n'] },
    { name: '序列', show: true, list: ['%n', '%nn'] }
  ];
}

describe('clearMarks / insertMark', () => {
  it('删标记按长的先删，不留半截', () => {
    expect(clearMarks('%%nn背景')).toBe('背景');
    expect(clearMarks('%%n背景')).toBe('背景');
    expect(clearMarks('%nn背景')).toBe('背景');
    expect(clearMarks('%n=背景')).toBe('背景');
    expect(clearMarks('%n背景###')).toBe('背景');
  });

  it('全部删净（多处出现一起删）', () => {
    expect(clearMarks('%n%n素材%n')).toBe('素材');
  });

  it('连点两次只留最后一个标记', () => {
    expect(insertMark('%n', '%%n')).toBe('%%n');
    expect(insertMark('保留文字%n', '%nn')).toBe('保留文字%nn');
  });
});

describe('checkExpression', () => {
  it('纯空白算空', () => {
    expect(checkExpression('   ')).toBe('不能输入空字符哦');
    expect(checkExpression('')).toBe('不能输入空字符哦');
  });

  it('有内容就通过', () => {
    expect(checkExpression('%n背景')).toBe('');
  });
});

describe('buildReplaceExpression', () => {
  it('两侧 trim 后拼成 a=>b', () => {
    const built = buildReplaceExpression(' 旧名 ', ' 新名 ');
    expect(built.status).toBe('ok');
    if (built.status === 'ok') expect(built.value).toBe('旧名=>新名');
  });

  it('任一侧为空 → VALIDATION', () => {
    expect(buildReplaceExpression('', '新名').status).toBe('error');
    expect(buildReplaceExpression('旧名', '  ').status).toBe('error');
  });
});

describe('isLayerColorIndex', () => {
  it('只认 0..7', () => {
    expect(isLayerColorIndex(0)).toBe(true);
    expect(isLayerColorIndex(7)).toBe(true);
    expect(isLayerColorIndex(8)).toBe(false);
    expect(isLayerColorIndex(-1)).toBe(false);
    expect(isLayerColorIndex(1.5)).toBe(false);
  });
});

describe('第 0 组不可改名 / 删除 / 加项', () => {
  it('isGroupEditable 只对 1..length-1 为真', () => {
    expect(isGroupEditable(0, 2)).toBe(false);
    expect(isGroupEditable(1, 2)).toBe(true);
    expect(isGroupEditable(2, 2)).toBe(false);
  });

  it('三条写操作都拦在第 0 组', () => {
    expect(renameGroupAt(preset(), 0, '改名').status).toBe('error');
    expect(deleteGroupAt(preset(), 0).status).toBe('error');
    expect(addItemAt(preset(), 0, '%n新').status).toBe('error');
  });

  it('可编辑组照常生效', () => {
    const renamed = renameGroupAt(preset(), 1, '新组');
    expect(renamed.status).toBe('ok');
    if (renamed.status === 'ok') expect(renamed.value[1]?.name).toBe('新组');

    const added = addItemAt(preset(), 1, '%n新');
    expect(added.status).toBe('ok');
    if (added.status === 'ok') expect(added.value[1]?.list).toEqual(['%n', '%nn', '%n新']);
  });
});

describe('addGroupAt', () => {
  it('不传 afterIndex 追加到末尾', () => {
    const added = addGroupAt(preset(), '新组');
    expect(added.status).toBe('ok');
    if (added.status === 'ok') expect(added.value.map((group) => group.name)).toEqual([RECENT_GROUP_NAME, '序列', '新组']);
  });

  it('afterIndex 0 插到第 1 位，不抢「最近使用」', () => {
    const added = addGroupAt(preset(), '新组', 0);
    expect(added.status).toBe('ok');
    if (added.status === 'ok') expect(added.value[1]?.name).toBe('新组');
  });

  it('空名 → VALIDATION', () => {
    expect(addGroupAt(preset(), '  ').status).toBe('error');
  });
});

describe('changeItemAt / deleteItemAt', () => {
  it('改与删都按组内下标', () => {
    const changed = changeItemAt(preset(), 1, 0, '%nn');
    expect(changed.status).toBe('ok');
    if (changed.status === 'ok') expect(changed.value[1]?.list).toEqual(['%nn', '%nn']);

    const deleted = deleteItemAt(preset(), 1, 1);
    expect(deleted.status).toBe('ok');
    if (deleted.status === 'ok') expect(deleted.value[1]?.list).toEqual(['%n']);
  });

  it('下标越界 → VALIDATION', () => {
    expect(changeItemAt(preset(), 1, 9, '%n').status).toBe('error');
    expect(deleteItemAt(preset(), 1, 9).status).toBe('error');
  });
});

describe('pushHistory', () => {
  it('去重后插最前', () => {
    const next = pushHistory(preset(), '%n');
    expect(next[0]?.list).toEqual(['%n']);
  });

  it('上限 8 条', () => {
    let current = preset();
    for (let index = 0; index < 12; index += 1) current = pushHistory(current, `%n${index}`);
    expect(current[0]?.list).toHaveLength(HISTORY_LIMIT);
    expect(current[0]?.list[0]).toBe('%n11');
  });

  it('空表达式不写历史', () => {
    expect(pushHistory(preset(), '   ')[0]?.list).toEqual(['%n']);
  });
});

describe('排序', () => {
  it('分组排序不动第 0 组', () => {
    expect(withGroupMoved(preset(), 0, 1, 'after').status).toBe('error');
  });

  it('跨组移动预设项', () => {
    const moved = withItemMoved(preset(), {
      from: { group: 1, index: 0 },
      to: { group: 1, index: 1 },
      position: 'after'
    });
    expect(moved.status).toBe('ok');
    if (moved.status === 'ok') expect(moved.value[1]?.list).toEqual(['%nn', '%n']);
  });
});

describe('文件边界', () => {
  it('`.cmm` 往返', () => {
    const text = serializePreset(seedPreset());
    const parsed = parsePreset(text);
    expect(parsed.status).toBe('ok');
    if (parsed.status === 'ok') expect(parsed.value.preset).toEqual(seedPreset());
  });

  it('不是 JSON → CORRUPT', () => {
    const parsed = parsePreset('不是 json');
    expect(parsed.status).toBe('error');
    if (parsed.status === 'error') expect(parsed.code).toBe('CORRUPT');
  });

  it('是 JSON 但顶层不是数组 → CORRUPT', () => {
    const parsed = parsePreset('{"name":"x"}');
    expect(parsed.status).toBe('error');
    if (parsed.status === 'error') expect(parsed.code).toBe('CORRUPT');
  });

  it('组缺 `show` → 那一组跳过并记账', () => {
    const decoded = decodeRenamePreset([{ name: RECENT_GROUP_NAME, show: false, list: [] }, { name: '坏组' }]);
    expect(decoded.status).toBe('ok');
    if (decoded.status === 'ok') {
      expect(decoded.value.preset).toHaveLength(1);
      expect(decoded.value.dropped).toHaveLength(1);
    }
  });

  it('组内非字符串项跳过并记账', () => {
    const decoded = decodeRenamePreset([
      { name: RECENT_GROUP_NAME, show: false, list: ['%n'] },
      { name: '序列', show: true, list: ['%n', 42] }
    ]);
    expect(decoded.status).toBe('ok');
    if (decoded.status === 'ok') {
      expect(decoded.value.preset[1]?.list).toEqual(['%n']);
      expect(decoded.value.dropped).toHaveLength(1);
    }
  });

  it('文件里没有「最近使用」时补一个空的', () => {
    const decoded = decodeRenamePreset([{ name: '序列', show: true, list: ['%n'] }]);
    expect(decoded.status).toBe('ok');
    if (decoded.status === 'ok') expect(decoded.value.preset[0]?.name).toBe(RECENT_GROUP_NAME);
  });
});

describe('seedPreset', () => {
  it('两组，7 + 4 条，都展开（逐字照原版截图）', () => {
    const seed = seedPreset();
    expect(seed).toHaveLength(2);
    expect(seed[0]?.list).toHaveLength(7);
    expect(seed[1]?.list).toHaveLength(4);
    expect(seed[0]?.show).toBe(true);
    expect(seed[1]?.show).toBe(true);
    expect(seed[1]?.list).toEqual(['%n', '%%n', '%n###', '%%n###']);
  });
});
