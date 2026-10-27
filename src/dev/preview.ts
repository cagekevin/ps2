/**
 * 仅开发用：给 `/font` 塞一份假的文字属性，方便在浏览器里对照样式。
 *
 * 为什么需要它：CEP 面板在浏览器里没有 `window.__adobe_cep__`，`zt_getFontSimpleInfo` 必然失败，
 * 属性区只会显示一行「正在读取文字属性…」，看不到字号 / 行距 / 颜色那几行的真实排版。
 *
 * 生产不加载：`main.tsx` 用 `import.meta.env.DEV` 守卫 + 动态 import。
 * 删除本文件时，连 `main.tsx` 里那三行一起删，不影响任何业务。
 */

import { DEFAULT_TEXT_INFO } from '../domain/text-info';
import { useTextStore } from '../store/text';

export function installPreviewData(): void {
  useTextStore.setState({
    info: {
      ...DEFAULT_TEXT_INFO,
      size: '24',
      weight: 'Regular',
      family: '思源黑体',
      leading: 12,
      tracking: 20,
      useAutoLeading: false,
      color: { r: 240, g: 240, b: 240 }
    },
    error: ''
  });
}
