import { describe, expect, it } from 'vitest';
import {
  buildPatches,
  createSizes,
  decodeDraft,
  decodeLayers,
  encodeLayers,
  LAYER_BREAK,
  MIN_SIZE,
  parseCreateLines,
  type TextLayerSnapshot
} from './text-batch';

const layers: TextLayerSnapshot[] = [
  { id: '1', name: '图层 12', text: '第一层', locked: false },
  { id: '2', name: '图层 12 拷贝', text: '第二行\r第三行', locked: false },
  { id: '3', name: '图层 8', text: '第四层', locked: true }
];

describe('encodeLayers', () => {
  it('三层出三行，层内换行变成 ⏎', () => {
    const text = encodeLayers(layers);
    expect(text.split('\n')).toHaveLength(3);
    expect(text).toBe(['第一层', `第二行${LAYER_BREAK}第三行`, '第四层'].join('\n'));
  });

  it('\\r\\n 与 \\r 都归一成 \\n 再转义', () => {
    const text = encodeLayers([{ id: '1', name: 'a', text: 'A\r\nB\rC', locked: false }]);
    expect(text).toBe(`A${LAYER_BREAK}B${LAYER_BREAK}C`);
  });
});

describe('decodeLayers', () => {
  it('结构合格就逐项交出来', () => {
    const result = decodeLayers([{ id: '1', name: 'a', text: 't', locked: false }]);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toHaveLength(1);
  });

  it('缺 id 整份失败（位置敏感，不许跳项）', () => {
    const result = decodeLayers([{ name: 'a', text: 't' }]);
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.code).toBe('CORRUPT');
  });

  it('顶层不是数组也失败', () => {
    expect(decodeLayers({ layers: [] }).status).toBe('error');
  });
});

describe('decodeDraft', () => {
  it('行数与层数不等就失败，现场进 detail', () => {
    const result = decodeDraft('a\nb', 3);
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('VALIDATION');
      expect(result.detail).toBe('lines:2 layers:3');
    }
  });

  it('⏎ 还原成换行', () => {
    const result = decodeDraft(`a${LAYER_BREAK}b\nc`, 2);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toEqual(['a\nb', 'c']);
  });

  it('空行合法（留空 = 不改）', () => {
    expect(decodeDraft('\na', 2).status).toBe('ok');
  });

  it('只有一层时清空整个输入框 = 一个空行', () => {
    const result = decodeDraft('', 1);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toEqual(['']);
  });
});

describe('buildPatches', () => {
  it('只留真的改过的层', () => {
    const result = buildPatches(layers, '第一层改\n第二行' + LAYER_BREAK + '第三行\n第四层');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toEqual([{ id: '1', text: '第一层改' }]);
  });

  it('留空 = 不改', () => {
    const result = buildPatches(layers, '\n\n第四层');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toEqual([]);
  });

  it('一个字没改就是空数组（空数组不调 jsx）', () => {
    const result = buildPatches(layers, encodeLayers(layers));
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toEqual([]);
  });

  it('行数不对直接失败，不产出 patch', () => {
    expect(buildPatches(layers, 'a').status).toBe('error');
  });
});

describe('createSizes', () => {
  it('三行：首行 92、末行 46、中间等比', () => {
    expect(createSizes(3, 92)).toEqual([92, 65.1, 46]);
  });

  it('六行：仍然首 92 末 46', () => {
    const sizes = createSizes(6, 92);
    expect(sizes[0]).toBe(92);
    expect(sizes[sizes.length - 1]).toBe(46);
  });

  it('二十行：单调递减，末行仍是 46（不会第 7 行开始全一样）', () => {
    const sizes = createSizes(20, 92);
    expect(sizes).toHaveLength(20);
    expect(sizes[sizes.length - 1]).toBe(46);
    for (let index = 1; index < sizes.length; index += 1) {
      expect(sizes[index]).toBeLessThan(sizes[index - 1] ?? 0);
    }
  });

  it('单行与零行', () => {
    expect(createSizes(1, 92)).toEqual([92]);
    expect(createSizes(0, 92)).toEqual([]);
  });

  it('字号极小也不低于下限', () => {
    expect(createSizes(4, 8).every((size) => size >= MIN_SIZE)).toBe(true);
  });
});

describe('parseCreateLines', () => {
  it('空行忽略，行首空格保留', () => {
    expect(parseCreateLines('一\n\n  二\n三')).toEqual(['一', '  二', '三']);
  });
});
