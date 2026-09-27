// sched.js：就绪队列的三个操作（纯状态迁移，前置校验在 schedrun 里做）
export function readyTask(state, task) {
  if (state.running) {
    return Object.assign({}, state, { queue: state.queue.concat([task]) });
  }
  return Object.assign({}, state, { running: task });
}

export function yieldTask(state, task) {
  const queue = state.queue.concat([task]);
  return Object.assign({}, state, { running: queue.shift(), queue: queue });
}

export function finishTask(state, task) {
  const queue = state.queue.slice();
  const next = queue.length > 0 ? queue.shift() : "";
  return Object.assign({}, state, {
    running: next, queue: queue, finished: state.finished.concat([task])
  });
}
