import assert from "node:assert";
import { readyTask, yieldTask, finishTask } from "../sched.js";
import { step, close } from "../schedrun.js";
import { render } from "../app.js";

const base = {
  budget: 1,
  state: { running: "", queue: [], finished: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "ready", task: "a" }],
  running_error_code: "E_NOT_RUNNING", ready_error_code: "E_ALREADY_READY",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("readyTask returns a state", () => {
  const got = readyTask({ running: "", queue: [], finished: [] }, "z");
  assert.strictEqual(typeof got, "object");
});

check("yieldTask returns a state", () => {
  const got = yieldTask({ running: "z", queue: [], finished: [] }, "z");
  assert.strictEqual(typeof got, "object");
});

check("finishTask returns a state", () => {
  const got = finishTask({ running: "z", queue: [], finished: [] }, "z");
  assert.strictEqual(typeof got, "object");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
