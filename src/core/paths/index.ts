/**
 * 【范本】路径工具
 * 全项目唯一的路径拼接入口。禁止在页面里手拼 `file://` 或反斜杠。
 */

import { getUserDataPath } from '../cep/bridge';
import { ROOTS } from '../storage';

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
 * 官方约定：缩略图在 `<userDir>/kuStyle/<id>.png`，渐变图在 `<userDir>/Gradient/<file>`。
 * `userDir` = `getSystemPath('userData')` + `/SheJiZhuLi`（原版 `USER_DIR`），
 * 不是裸的 userData —— 少这一段所有缩略图都会 404（表现就是整片破图）。
 */
export function userAssetUrl(...segments: string[]): string {
  const root = ROOTS.legacy.replace(/^\//, '');
  return `${osPrefix()}${userSubPath(root, ...segments)}`;
}
