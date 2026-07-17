import { makeSyscall } from "./envelope.js";
import { gate } from "./gate.js";
import { think } from "./akashml.js";
import { act } from "./tools.js";
import * as wall from "./wall.js";

// The cycle. Pure. A DENY becomes information, not an error: the agent re-plans
// against a smaller world by escalating to a human.
function correct(sys) {
  const o = sys.observation;
  if (o && o.kind === "eperm") {
    return [
      {
        id: "t_escalate",
        goal: `Escalate ${o.denied_tool} to a human`,
        tool: "escalate_to_human",
        args: { reason: o.reason, denied: o.denied_tool },
        parent: sys.id,
      },
    ];
  }
  return [];
}

export async function run(env) {
  const state = { spend: 0, bought: [], example: null, metaview: null, escalated: false };
  const START_BUDGET = 100;

  const queue = [
    { id: "t1", goal: "Read the hackathon corpus", tool: "read_corpus", args: { what: "all" } },
    { id: "t2", goal: "Confirm the live tool surface", tool: "check_live_surface", args: {} },
    { id: "t3", goal: "Draft the submission", tool: "draft", args: { section: "what_it_does" } },
    {
      id: "t4",
      goal: "Acquire a capability it lacks",
      tool: "acquire_capability",
      args: { name: "render_worked_example" },
    },
    { id: "t5", goal: "Build the worked example", tool: "build_worked_example", args: { deal: "NW-1" } },
    { id: "t6", goal: "Submit the entry", tool: "submit_entry", args: {} },
  ];

  wall.intro(env);

  let cycle = 0;
  while (queue.length) {
    const task = queue.shift();
    cycle += 1;

    // PLAN — cognition supplies the rationale; the loop itself stays deterministic.
    const t = await think(
      `Task: ${task.goal}. In one terse clause, why is "${task.tool}" the next move?`,
      env,
    );
    state.spend += t.cost;
    const sys = makeSyscall(task, t.text || task.goal);

    // ACT — through the gate, always.
    sys.verdict = await gate(sys, env);
    sys.observation =
      sys.verdict.decision === "DENY"
        ? { kind: "eperm", denied_tool: sys.tool, reason: sys.verdict.reason }
        : await act(sys, env, state);

    sys.cost = { plan_usd: t.cost, budget_remaining_usd: START_BUDGET - state.spend };
    wall.cycle({ n: cycle, sys, live: t.live, budget: START_BUDGET - state.spend });

    // SELF-CORRECT — run the follow-on immediately.
    queue.unshift(...correct(sys));
    if (sys.observation.halt) break;
  }

  wall.receipt(state, START_BUDGET);
}
