/**
 * 底栏：26px 图标条。
 *
 * 原版是四个「添加×分组」+ 导入 + 导出（`app.v4.js:49773-49874`）。
 *
 * **前两个按钮的图标是图片，不是 sprite 图标**：
 * - 颜色：14×14 彩虹渐变方块（原版 `img/bottom1.f8c1ea17.svg`）
 * - 渐变：14×14 蓝色渐变方块（原版 `img/bottom2.5843fcfd.svg`）
 *
 * 用线框的 `iconchuangjian` 代替，肉眼一眼就不同（对照清单 #100）。
 * 渐变色照抄原版 SVG，id 改成 `mm-` 前缀避免两个渐变互相覆盖。
 */
import { Icon } from '../../../components/icons';
import { KU_KINDS, KU_TAB_LABELS, type KuKind } from '../../../domain/style-library';

const ICONS: Record<'font' | 'style', 'iconzitimianban' | 'iconxinjianyangshifenzu'> = {
  font: 'iconzitimianban',
  style: 'iconxinjianyangshifenzu'
};

/** 原版 `img/bottom1.f8c1ea17.svg`：新建颜色分组 */
function ColorSwatch() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <defs>
        <linearGradient
          id="mm-bottom-color"
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
      <rect width="14" height="14" rx="2" fill="url(#mm-bottom-color)" />
    </svg>
  );
}

/** 原版 `img/bottom2.5843fcfd.svg`：新建渐变分组 */
function GradientSwatch() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <defs>
        <linearGradient
          id="mm-bottom-gradient"
          y1="0.5"
          x2="1"
          y2="0.5"
          gradientUnits="objectBoundingBox"
        >
          <stop offset="0" stopColor="#227cd7" />
          <stop offset="1" stopColor="#a3d0fe" />
        </linearGradient>
      </defs>
      <rect width="14" height="14" rx="2" fill="url(#mm-bottom-gradient)" />
    </svg>
  );
}

export function BottomBar({ onAddGroup }: { onAddGroup: (kind: KuKind) => void }) {
  return (
    <div className="mm-style__bottom">
      {KU_KINDS.map((kind, index) => (
        <button
          key={kind}
          type="button"
          className="mm-style__bottom-btn"
          title={`添加${KU_TAB_LABELS[index]}分组`}
          onClick={() => onAddGroup(kind)}
        >
          {kind === 'color' ? (
            <ColorSwatch />
          ) : kind === 'gradient' ? (
            <GradientSwatch />
          ) : (
            <Icon name={ICONS[kind]} size={18} />
          )}
        </button>
      ))}

      <span className="mm-style__bottom-divider" />

      <button type="button" className="mm-style__bottom-btn" disabled title="导入还没实现">
        <Icon name="icondaoru" size={18} />
      </button>
      <button type="button" className="mm-style__bottom-btn" disabled title="导出还没实现">
        <Icon name="icondaochu" size={18} />
      </button>
    </div>
  );
}
