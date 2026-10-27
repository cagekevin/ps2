/**
 * 3 星收藏。hover 临时显示到第几星，移开恢复已选值。
 * 点同一档 = 取消（取消逻辑在命令层，组件只回传星数）。
 */
import { useState } from 'react';

interface Props {
  selected: number;
  onRate: (value: number) => void;
}

export function Rating({ selected, onRate }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const score = hover ?? selected;

  return (
    <div
      className="mm-font__rating"
      role="group"
      aria-label="收藏评分"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3].map((value) => (
        <button
          key={value}
          type="button"
          className={`mm-font__star${value <= score ? ' mm-font__star--on' : ''}`}
          aria-label={`${value} 星`}
          aria-pressed={value <= selected}
          onMouseEnter={() => setHover(value)}
          onClick={(event) => {
            event.stopPropagation();
            onRate(value);
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}
