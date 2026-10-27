/**
 * 【范本】按 key 串行执行异步任务。
 *
 * 只解决一件事：同一资源的「读 → 改 → 写」必须整体排队，而不只是写排队。
 * 前一个任务失败不阻塞后一个（队列只保证顺序，不传递失败）。
 */
const queues = new Map<string, Promise<unknown>>();

export function runSerial<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  const tracked = next.catch(() => undefined);

  queues.set(key, tracked);
  void tracked.finally(() => {
    if (queues.get(key) === tracked) queues.delete(key);
  });

  return next;
}
