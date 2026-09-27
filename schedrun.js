// schedrun.js：按处理预算处理并留账
import { readyTask, yieldTask, finishTask } from "./sched.js";

const KINDS = { ready: true, yield: true, finish: true };

function fail(code, message) {
  const error = new Error(message || code);
  error.code = code;
  throw error;
}

function cloneState(state) {
  const source = state || {};
  return {
    running: source.running || "",
    queue: (source.queue || []).slice(),
    finished: (source.finished || []).slice(),
    ledger: (source.ledger || []).map(function (row) { return row.slice(); }),
    applied: (source.applied || []).slice()
  };
}

function validateEvents(spec, events) {
  const code = spec.event_error_code || "E_BAD_EVENT";
  events.forEach(function (event) {
    const ok = event !== null && typeof event === "object"
      && Object.prototype.hasOwnProperty.call(KINDS, event.kind)
      && typeof event.task === "string" && event.task.length > 0;
    if (!ok) fail(code, "bad event: " + JSON.stringify(event));
  });
}

function applyRow(spec, state, row) {
  const kind = row[0];
  const task = row[1];
  if (kind === "ready") {
    if (task === state.running || state.queue.indexOf(task) !== -1
        || state.finished.indexOf(task) !== -1) {
      fail(spec.ready_error_code || "E_ALREADY_READY", "already ready: " + task);
    }
    return readyTask(state, task);
  }
  if (task !== state.running) {
    fail(spec.running_error_code || "E_NOT_RUNNING", "not running: " + task);
  }
  return kind === "yield" ? yieldTask(state, task) : finishTask(state, task);
}

function adopt(state, next) {
  state.running = next.running;
  state.queue = next.queue;
  state.finished = next.finished;
}

export function step(spec) {
  const events = spec.events || [];
  validateEvents(spec, events);
  const state = cloneState(spec.state);
  const budget = Math.max(0, spec.budget || 0);
  const seen = {};
  state.applied.forEach(function (id) { seen[id] = true; });
  let judged = 0;
  const work = state.ledger.map(function (row) { return row.slice(); });
  events.forEach(function (event) {
    judged += 1;
    if (event.id !== undefined) {
      if (seen[event.id]) return;
      seen[event.id] = true;
      state.applied.push(event.id);
    }
    work.push([event.kind, event.task]);
  });
  let served = 0;
  const rest = [];
  work.forEach(function (row) {
    if (served < budget) {
      served += 1;
      adopt(state, applyRow(spec, state, row));
    } else {
      rest.push(row);
    }
  });
  state.ledger = rest;
  return {
    state: state,
    served: served,
    ledger_before: rest.length,
    ledger: rest.map(function (row) { return row.slice(); }),
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const state = cloneState(spec.state);
  let catchup = 0;
  state.ledger.forEach(function (row) {
    adopt(state, applyRow(spec, state, row));
    catchup += 1;
  });
  state.ledger = [];
  return { state: state, catchup: catchup };
}
