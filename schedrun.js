// schedrun.js：按处理预算处理并留账，收尾不限预算把账补齐
import { readyTask, yieldTask, finishTask } from "./sched.js";

const OPS = { ready: readyTask, yield: yieldTask, finish: finishTask };

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function remap(error, spec) {
  if (error && error.code === "E_NOT_RUNNING" && spec.running_error_code) {
    fail(spec.running_error_code, error.message);
  }
  if (error && error.code === "E_ALREADY_READY" && spec.ready_error_code) {
    fail(spec.ready_error_code, error.message);
  }
  throw error;
}

function applyEvent(current, kind, task, spec) {
  try {
    return Object.assign({}, current, OPS[kind](current, task));
  } catch (error) {
    remap(error, spec);
  }
}

function eventKey(event, index) {
  if (event.id !== undefined) return event.id;
  return event.kind + ":" + event.task + ":" + index;
}

function checkEvents(spec, events) {
  const badCode = spec.event_error_code || "E_BAD_EVENT";
  events.forEach(function (event) {
    if (!event || typeof event !== "object" || !OPS[event.kind]
        || typeof event.task !== "string" || event.task === "") {
      fail(badCode, "bad event: " + JSON.stringify(event));
    }
  });
}

function freshState(state) {
  return { running: state.running, queue: state.queue.slice(),
           finished: state.finished.slice(), ledger: [], applied: state.applied.slice() };
}

export function step(spec) {
  const state = spec.state;
  const events = spec.events || [];
  checkEvents(spec, events);
  let current = freshState(state);
  let budgetLeft = spec.budget === undefined ? 0 : spec.budget;
  let served = 0;
  let judged = 0;
  const judged_bound = state.ledger.length + events.length;
  const pending = [];
  state.ledger.forEach(function (entry) {
    judged += 1;
    if (budgetLeft > 0) {
      current = applyEvent(current, entry[0], entry[1], spec);
      if (entry.id !== undefined && current.applied.indexOf(entry.id) === -1) {
        current.applied.push(entry.id);
      }
      served += 1;
      budgetLeft -= 1;
    } else {
      pending.push(entry);
    }
  });
  events.forEach(function (event, index) {
    judged += 1;
    const key = eventKey(event, index);
    if (current.applied.indexOf(key) !== -1) return;
    if (budgetLeft > 0) {
      current = applyEvent(current, event.kind, event.task, spec);
      current.applied.push(key);
      served += 1;
      budgetLeft -= 1;
    } else {
      const entry = [event.kind, event.task];
      if (event.id !== undefined) entry.id = event.id;
      pending.push(entry);
    }
  });
  current.ledger = pending;
  return { state: current, served: served, ledger_before: pending.length,
           ledger: pending, judged: judged, judged_bound: judged_bound };
}

export function close(spec) {
  const state = spec.state;
  let current = freshState(state);
  let catchup = 0;
  state.ledger.forEach(function (entry) {
    current = applyEvent(current, entry[0], entry[1], spec);
    if (entry.id !== undefined && current.applied.indexOf(entry.id) === -1) {
      current.applied.push(entry.id);
    }
    catchup += 1;
  });
  return { state: current, catchup: catchup };
}
