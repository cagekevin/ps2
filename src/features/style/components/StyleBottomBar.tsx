/**
 * 样式页底栏：四个「添加×分组」+ 导入 + 导出（原版 `app.v4.js:49773-49874`）。
 *
 * **壳与按钮用公共件** `components/BottomBar`（26 高 / 深底 / 30 宽 / 竖线），
 * 本文件只剩业务：两个彩虹方块 + 导入导出菜单。
 *
 * 前两个按钮的图标是图片，不是 sprite：颜色 / 渐变的彩虹方块（原版 14×14，viewBox 不变）；
 * **尺寸由底栏外壳统一给**（`bottom-bar.css` 的 `.mm-bottom-bar svg`），这里不写 width / height
 * （原版 `img/bottom1*.svg` / `img/bottom2*.svg`），渐变色照抄，id 改 `mm-` 前缀避免互相覆盖。
 */
import { useRef, useState } from 'react';
import { BottomBar, BottomBarButton, BottomBarDivider } from '../../../components/BottomBar';
import { ContextMenu } from '../../../components/ContextMenu';
import { Icon } from '../../../components/icons';
import { KU_KINDS, KU_TAB_LABELS, type KuKind } from '../../../domain/style-library';

const ICONS: Record<'font' | 'style', 'iconzitimianban' | 'iconxinjianyangshifenzu'> = {
  font: 'iconzitimianban',
  style: 'iconxinjianyangshifenzu'
};

/** 原版 `img/bottom1.f8c1ea17.svg`：新建颜色分组 */
function ColorSwatch() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <defs>
        <linearGradient
          id="style-bottom-color"
          x1="1"
          y1="0.612"
          x2="0"
          y2="0.612"
          gradientUnits="objectBoundingBox"
        >
          <stop offset="0" stopColor="#f03d4f" />
          <stop offset="0.154" stopColor="#f42cce" />
          <stop offset="0.295" stopColor="#231f9e" />
          <stop offset="0.44" stopColor="#2abfe9" />
          <stop offset="0.607" stopColor="#99ec55" />
          <stop offset="0.752" stopColor="#fcf011" />
          <stop offset="0.864" stopColor="#ffae20" />
          <stop offset="1" stopColor="#f02b1f" />
        </linearGradient>
      </defs>
      <rect width="14" height="14" rx="2" fill="url(#style-bottom-color)" />
    </svg>
  );
}

/** 原版 `img/bottom2.5843fcfd.svg`：新建渐变分组 */
function GradientSwatch() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <defs>
        <linearGradient
          id="style-bottom-gradient"
          y1="0.5"
          x2="1"
          y2="0.5"
          gradientUnits="objectBoundingBox"
        >
          <stop offset="0" stopColor="#227cd7" />
          <stop offset="1" stopColor="#a3d0fe" />
        </linearGradient>
      </defs>
      <rect width="14" height="14" rx="2" fill="url(#style-bottom-gradient)" />
    </svg>
  );
}

interface Props {
  onAddGroup: (kind: KuKind) => void;
  onImport: (append: boolean) => void;
  onExport: (current: boolean) => void;
}

export function StyleBottomBar({ onAddGroup, onImport, onExport }: Props) {
  const [menu, setMenu] = useState<'import' | 'export' | null>(null);
  const ioAnchor = useRef<HTMLElement | null>(null);

  return (
    <BottomBar>
      {KU_KINDS.map((kind, index) => (
        <BottomBarButton
          key={kind}
          title={`添加${KU_TAB_LABELS[index]}分组`}
          onClick={() => onAddGroup(kind)}
        >
          {kind === 'color' ? (
            <ColorSwatch />
          ) : kind === 'gradient' ? (
            <GradientSwatch />
          ) : (
            <Icon name={ICONS[kind]} />
          )}
        </BottomBarButton>
      ))}

      <BottomBarDivider />

      <BottomBarButton
        title="导入预设仓库"
        name="icondaoru"
        onClick={(event) => {
          ioAnchor.current = event.currentTarget as HTMLElement;
          setMenu('import');
        }}
      />
      <BottomBarButton
        title="导出样式仓库"
        name="icondaochu"
        onClick={(event) => {
          ioAnchor.current = event.currentTarget as HTMLElement;
          setMenu('export');
        }}
      />

      {menu ? (
        <ContextMenu
          anchor={ioAnchor.current}
          items={
            menu === 'import'
              ? [
                  { label: '导入预设仓库（覆盖）', onSelect: () => onImport(false) },
                  { label: '追加预设仓库', onSelect: () => onImport(true) }
                ]
              : [
                  { label: '导出所有仓库…', onSelect: () => onExport(false) },
                  { label: '导出当前仓库…', onSelect: () => onExport(true) }
                ]
          }
          onClose={() => setMenu(null)}
        />
      ) : null}
    </BottomBar>
  );
}
