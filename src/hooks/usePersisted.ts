/**
 * 【范本】会记住的 state
 *
 * 用于界面偏好：tab 展开状态、筛选档位、上次选的仓库。
 * **业务数据不要用**（样式库内容、字体列表必须每次从磁盘/PS 读最新的）。
 *
 * key 来自 `core/prefs` 的 PrefKey 联合类型，写错编译不过。
 */

import { useCallback, useState } from 'react';
import { getPref, setPref, type PrefKey } from '../core/prefs';

export function usePersisted<T>(key: PrefKey, fallback: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => getPref(key, fallback));

  const update = useCallback(
    (next: T) => {
      setValue(next);
      setPref(key, next);
    },
    [key]
  );

  return [value, update];
}
