import { makeSyscall } from "./envelope.js";
import { gate } from "./gate.js";
import { think } from "./akashml.js";
import { act } from "./tools.js";
import { auditCount } from "./audit.js";

const START_BUDGET = 100;

const SPONSOR_OF = {
  check_live_surface: ["metaview"],
  acquire_capability: ["zero"],
  build_worked_example: ["payload"],
};

function freshState() {
  return { spend: 0, bought: [], example: null, metaview: null, submitted: false };
}

function cycleEvent(n, sys, live, budget, sponsors, human = false) {
  const v = sys.verdict;
  const o = sys.observation;
  const deny = v.decision === "DENY";
  return {
    t: "cycle",
    n,
    human,
    tool: sys.tool,
    identity: sys.identity,
    rationale: sys.rationale,
    decision: v.decision,
    status: v.status,
    reason: v.reason,
    observe: deny ? `eperm: ${sys.tool} denied` : o.summary,
    correct: deny ? "await human attestation" : o.halt ? "halt" : "queue next",
    example: sys.tool === "build_worked_example" ? o.data : null,
    budget,
    live,
    sponsors,
  };
}

function receiptEvent(state) {
  const ex = state.example;
  const lines = [];
  lines.push({
    ok: true,
    sponsor: "metaview",
    text: state.metaview?.live ? `${state.metaview.tools.length} Metaview tools read live` : "corpus read (Metaview offline)",
  });
  lines.push({
    ok: true,
    sponsor: "zero",
    text: `${state.bought.length} capability bought $${state.bought.reduce((a, b) => a + b.paid, 0).toFixed(3)}`,
  });
  if (ex)
    lines.push({
      ok: !ex.breach,
      sponsor: "payload",
      text: `worked example ${ex.deal}: ICR ${ex.corrected}x ${ex.breach ? "BREACH" : "ok"} (naive ${ex.naive}x green — wrong)`,
    });
  lines.push({ ok: true, sponsor: "akash", text: `cognition spend ~$${state.spend.toFixed(3)}` });
  lines.push({ ok: true, sponsor: "pomerium", text: `${auditCount()} actions authorized before they ran (audit.jsonl)` });
  return { t: "receipt", lines, submitted: state.submitted };
}

// Run autonomously until the agent hits an action it can't take alone.
export async function run(env, emit) {
  const state = freshState();
  const queue = [
    { id: "t1", goal: "Read the hackathon corpus", tool: "read_corpus", args: { what: "all" } },
    { id: "t2", goal: "Confirm the live tool surface", tool: "check_live_surface", args: {} },
    { id: "t3", goal: "Draft the submission", tool: "draft", args: { section: "what_it_does" } },
    { id: "t4", goal: "Acquire a capability it lacks", tool: "acquire_capability", args: { name: "render_worked_example" } },
    { id: "t5", goal: "Build the worked example", tool: "build_worked_example", args: { deal: "NW-1" } },
    { id: "t6", goal: "Submit the entry", tool: "submit_entry", args: {} },
  ];

  const live = [];
  if (env.AKASHML_API_KEY && env.AKASHML_MODEL) live.push("AkashML");
  if (env.METAVIEW_API_KEY) live.push("Metaview");
  if (env.ZERO_ENABLED) live.push("Zero");
  emit({ t: "intro", live });

  let cycle = 0;
  while (queue.length) {
    const task = queue.shift();
    cycle += 1;
    const th = await think(`Task: ${task.goal}. In one terse clause, why is "${task.tool}" the next move?`, env);
    state.spend += th.cost;
    const sys = makeSyscall(task, th.text || task.goal, "agent");
    sys.verdict = await gate(sys, env);
    const sponsors = ["pomerium", "akash", ...(SPONSOR_OF[task.tool] || [])];

    if (sys.verdict.decision === "DENY") {
      sys.observation = { kind: "eperm", denied_tool: sys.tool, reason: sys.verdict.reason };
      emit(cycleEvent(cycle, sys, th.live, START_BUDGET - state.spend, sponsors));
      emit({ t: "await", tool: sys.tool, reason: sys.verdict.reason });
      return { state, pending: task, cycle };
    }
    sys.observation = await act(sys, env, state);
    emit(cycleEvent(cycle, sys, th.live, START_BUDGET - state.spend, sponsors));
    if (sys.observation.halt) break;
  }
  emit(receiptEvent(state));
  return { state, done: true };
}

// The human attests: re-run the denied action as "operator". Same gate, allowed.
export async function attest(env, ctx, emit) {
  const { state, pending, cycle } = ctx;
  const th = await think(`A human operator attests: ${pending.goal}.`, env);
  state.spend += th.cost;
  const sys = makeSyscall(pending, "human operator attests — this identity carries the authority the agent lacked", "operator");
  sys.verdict = await gate(sys, env);
  if (sys.verdict.decision === "ALLOW") {
    sys.observation = await act(sys, env, state);
    state.submitted = true;
  } else {
    sys.observation = { kind: "eperm", denied_tool: sys.tool, reason: sys.verdict.reason };
  }
  emit(cycleEvent(cycle + 1, sys, th.live, START_BUDGET - state.spend, ["pomerium", "akash"], true));
  emit(receiptEvent(state));
  return { state, done: true };
}
