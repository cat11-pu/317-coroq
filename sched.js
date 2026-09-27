// sched.js：就绪队列的三个操作（按当前状态判，不合法就抛带 code 的错误）
function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

export function readyTask(state, task) {
  if (task === state.running || state.queue.indexOf(task) !== -1
      || state.finished.indexOf(task) !== -1) {
    fail("E_ALREADY_READY", "task already ready: " + task);
  }
  if (!state.running) {
    return { running: task, queue: state.queue.slice(), finished: state.finished.slice() };
  }
  return { running: state.running, queue: state.queue.concat([task]),
           finished: state.finished.slice() };
}

export function yieldTask(state, task) {
  if (!state.running || state.running !== task) {
    fail("E_NOT_RUNNING", "task not running: " + task);
  }
  if (state.queue.length === 0) {
    return { running: state.running, queue: [], finished: state.finished.slice() };
  }
  return { running: state.queue[0], queue: state.queue.slice(1).concat([task]),
           finished: state.finished.slice() };
}

export function finishTask(state, task) {
  if (!state.running || state.running !== task) {
    fail("E_NOT_RUNNING", "task not running: " + task);
  }
  const finished = state.finished.concat([task]);
  if (state.queue.length === 0) {
    return { running: "", queue: [], finished: finished };
  }
  return { running: state.queue[0], queue: state.queue.slice(1), finished: finished };
}
