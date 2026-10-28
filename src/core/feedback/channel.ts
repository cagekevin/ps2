/**
 * 【范本】状态通道：订阅 + 通知 + 挂载门（零 React）。
 *
 * 新增同类状态（确认框之类）照此结构：状态数组留在各自模块，订阅 / 通知 / 挂载计数只用这里。
 *
 * 用途：同目录的 `toast` / `loading` 都用它组合；新增状态（确认框之类）照此接，
 * 不许再手写一份 `new Set()` + `emit()` + `mounted` 计数。
 *
 * 本文件只放这两件最小的事。要放业务状态（提示条有哪些、转圈文案栈）留在各自的模块里，
 * 别把它做成「万能 store」。
 */

export interface Channel {
  /** 订阅；返回退订函数 */
  subscribe: (listener: () => void) => () => void;
  /** 通知所有订阅者（同步，按订阅顺序） */
  emit: () => void;
  /** 当前订阅者数：只给诊断与测试用，业务不要拿它做判断 */
  size: () => number;
}

/** 单通道：同一份状态的订阅表 */
export function createChannel(): Channel {
  const listeners = new Set<() => void>();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit() {
      for (const listener of listeners) listener();
    },
    size: () => listeners.size
  };
}

export interface MountGate {
  /** 登记一个容器；返回注销函数 */
  mount: () => () => void;
  /** 有容器在 = 状态写得出去、有人渲染 */
  isMounted: () => boolean;
}

/**
 * 挂载门：计数而非布尔。
 *
 * 用计数是因为同一类容器可能同时存在多个（开发模式下 StrictMode 双挂载、
 * 未来多面板），布尔会被最后一个卸载的人提前关掉。
 */
export function createMountGate(): MountGate {
  let mounted = 0;

  return {
    mount() {
      mounted += 1;
      return () => {
        mounted -= 1;
      };
    },
    isMounted: () => mounted > 0
  };
}
