/**
 * 矢量化命令：选中图层 → 白底 PNG → vtracer → 路径点 → 形状层（替换原层）。
 *
 * 时序不能乱，**删除原层在最后一步**（jsx 里做的）：前面任何一步失败，原图层都还在。
 *
 * 三条硬规则同其它命令（`CONVENTIONS` §9）：不碰 DOM、不弹 toast、只返回 `Result<T>`。
 * 坐标解析全在 `domain/vectorize`，这里只编排。
 */

import { MSG } from '../types/messages';
import { fail, failWithDetail, ok, type Result } from '../types/result';
import type { VectorSubPath } from '../types/vectorize';
import { log } from '../core/logger';
import { exportLayer, replaceWithPath } from '../core/ps/vectorize';
import { readTextAt, removeFileAt } from '../core/storage';
import { rasterToSvg } from '../core/vectorize/vtracer';
import {
  extractSvgPaths,
  hexToRgb,
  isCanvasBackground,
  parseSvgPath,
  svgCanvasSize
} from '../domain/vectorize';

/** 临时产物删不掉只记日志：不影响结果，不该让用户以为转换失败 */
function dropTemp(path: string): void {
  const removed = removeFileAt(path);
  if (removed.status === 'error') log.warn('临时文件删除失败', { path, reason: removed.reason });
}

/**
 * 把当前选中的图层转成矢量形状层（**直接替换**，不是新增一层）。
 *
 * `points` 是建成的路径点总数，给状态行用（用户能据此判断复杂不复杂）。
 */
export async function vectorizeSelection(): Promise<Result<{ points: number }>> {
  /*
   * 「恰好选中一个」不在这里判：那是**能力表**的前置条件（`CAP.vecExport.require`
   * → `requireSelection({ exact: 1 }, MSG.vectorize.needOne)`），调用前由 `callCapability`
   * 统一跑。命令层**不重复判**，也不自己造文案 —— 判据一处、文案归调用方。
   *
   * 图层名同样不在这一层取：形状层沿用原层名，而原层名只有 jsx 拿得准
   * （`doc.activeLayer.name`，删除前读）。命令层为它多调一次 `getLayerState`
   * 既多余、又可能拿到导出后变化的当前层。
   */
  const exported = await exportLayer();
  if (exported.status === 'error') return exported;

  const pngPath = exported.value;
  const svgPath = pngPath.replace(/\.png$/i, '.svg');

  const converted = await rasterToSvg(pngPath, svgPath);
  if (converted.status === 'error') {
    dropTemp(pngPath);
    return converted;
  }

  const svgText = readTextAt(svgPath);
  if (svgText.status === 'error') {
    dropTemp(pngPath);
    dropTemp(svgPath);
    return svgText;
  }

  const entries = extractSvgPaths(svgText.value);
  if (!entries.length) {
    dropTemp(pngPath);
    dropTemp(svgPath);
    return fail('VALIDATION', MSG.vectorize.empty);
  }

  /*
   * 每条 `<path>` 可能含多条子路径；除**铺满画布的背景**外全部并进同一个形状层
   * （PS 的一个 PathItem 可含多条子路径）。
   *
   * 背景必须丢掉：vtracer 的 `bw` 档先吐一条覆盖全画布的底色 path，并进来就填成整块实心，
   * 表现就是「路径画的不对」（真机 2026-11-02）。
   */
  /*
   * 画布尺寸是「哪条是背景」这条判据的输入。认不出就没有判据 —— 不许当成
   * 「没有背景」继续跑：那样背景会被并进形状层，用户看到整块实心，而日志里什么都没有。
   */
  const canvas = svgCanvasSize(svgText.value);
  if (!canvas) {
    dropTemp(pngPath);
    dropTemp(svgPath);
    return failWithDetail('CORRUPT', MSG.corrupt, 'svg:no-size');
  }

  const subpaths: VectorSubPath[] = [];
  let fill: string | null = null;

  for (const entry of entries) {
    const parsed = parseSvgPath(entry.d);
    if (parsed.status === 'error') {
      dropTemp(pngPath);
      dropTemp(svgPath);
      return parsed;
    }
    if (isCanvasBackground(parsed.value, canvas)) continue;

    subpaths.push(...parsed.value);
    /* 填充色取**第一条非背景**路径的 fill（背景那条的 fill 是底色，不是用户要的色） */
    if (fill === null) fill = entry.fill;
  }

  if (!subpaths.length) {
    dropTemp(pngPath);
    dropTemp(svgPath);
    return fail('VALIDATION', MSG.vectorize.empty);
  }

  /* 认不出填色就是引擎输出不合契约（`bw` 档必带 `#rrggbb`）：报出去，不猜一个颜色顶替 */
  const rgb = hexToRgb(fill);
  if (!rgb) {
    dropTemp(pngPath);
    dropTemp(svgPath);
    return failWithDetail('CORRUPT', MSG.corrupt, `svg:fill:${fill ?? 'missing'}`);
  }

  const color = rgb;

  const written = await replaceWithPath({ color, subpaths });

  dropTemp(pngPath);
  dropTemp(svgPath);

  if (written.status === 'error') return written;

  const points = subpaths.reduce((sum, subpath) => sum + subpath.points.length, 0);
  if (!written.value.ok) {
    return failWithDetail('PS_BAD_PAYLOAD', MSG.vectorize.empty, 'subpaths:0');
  }
  return ok({ points });
}
