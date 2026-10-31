/**
 * 【范本】路径工具
 * 全项目唯一的路径拼接入口。禁止在页面里手拼 `file://` 或反斜杠。
 */

import { getUserDataPath } from '../cep/bridge';
import { ROOTS, type StorageRoot } from '../storage';

/**
 * CEP 里 `<img src>` 需要的前缀。
 *
 * Windows 也必须带 `file:///`——Chromium 不认裸的 `C:/...`，会当相对路径解析，
 * 表现就是缩略图全破。三段斜杠是因为后面接的是 `C:/...`（盘符前没有斜杠）。
 */
export function osPrefix(): string {
  return navigator.platform.toLowerCase().includes('mac') ? 'file://' : 'file:///';
}

function toPosix(path: string): string {
  return path.replace(/\\/g, '/');
}

/** 用户数据目录下的绝对路径（正斜杠） */
export function userSubPath(...segments: string[]): string {
  return [toPosix(getUserDataPath()), ...segments].join('/').replace(/\/+/g, '/');
}

/**
 * 可直接塞进 <img src> 的资源地址。
 *
 * **根是参数，不是写死**：`root` 取 `core/storage` 的数据根（`legacy` = `/SheJiZhuLi`、
 * `data` = `/Maomao`）。样式库的缩略图在 `legacy`（官方 `USER_DIR`），模板库的在 `data`；
 * 写死一个根就会逼出第二个 `xxxAssetUrl`（两个拼法 = 下一个人一定抄错那个）。
 *
 * **每段都 encode**：CEP 的 `<img>` 走 `file://`，中文 / 空格 / `#` 不编码就 404
 * （表现是整片破图，且控制台不一定报错）。段内的 `/` 被编成 `%2F`，不会被当路径分隔符。
 */
export function userAssetUrl(root: StorageRoot, ...segments: string[]): string {
  const rootName = ROOTS[root].replace(/^\//, '');
  return `${osPrefix()}${userSubPath(rootName, ...segments.map(encodeURIComponent))}`;
}
