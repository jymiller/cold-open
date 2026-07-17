import { think } from "./akashml.js";
import { metaviewTools } from "./metaview.js";
import { acquireCapability } from "./zero.js";

// The corpus the harness reads. Synthetic; nothing from any prior project.
export const CORPUS = {
  event: "Loop Engineering Hackathon",
  sponsors: ["Pomerium", "Akash", "Zero.xyz", "Metaview", "Nexla", "AWS"],
  tracks: 5,
  rule: "Use 3+ sponsor tools. Ship a self-directing agent across the build cycle.",
};

// The worked example the harness builds to prove it makes real things, not
// slides: a covenant-drift catch. A renamed EBITDA line hides a breach.
export function covenantExample() {
  const q2 = { ebitda: 320, net_interest: 210 };
  const q3 = { adjusted_ebitda: 285, net_interest: 214 }; // renamed + restated down
  const threshold = 1.4;
  const baseline = +(q2.ebitda / q2.net_interest).toFixed(2); // 1.52 green
  const naive = +(q2.ebitda / q3.net_interest).toFixed(2); // 1.50 green — WRONG (stale ebitda)
  const corrected = +(q3.adjusted_ebitda / q3.net_interest).toFixed(2); // 1.33 — BREACH
  return { deal: "NW-1", threshold, baseline, naive, corrected, breach: corrected < threshold };
}

// Execute an ALLOWED syscall, return an observation.
export async function act(sys, env, state) {
  switch (sys.tool) {
    case "read_corpus":
      return {
        kind: "result",
        summary: `${CORPUS.sponsors.length} sponsors, ${CORPUS.tracks} tracks, 1 rule`,
        data: CORPUS,
      };

    case "check_live_surface": {
      const mv = await metaviewTools(env);
      state.metaview = mv;
      return {
        kind: "result",
        summary: mv.live
          ? `Metaview MCP live — ${mv.tools.length} tools`
          : "Metaview offline (no key) — using corpus",
        data: mv,
      };
    }

    case "draft": {
      const t = await think(
        "One sentence: what an autonomous hackathon-prep harness does, ending on it asking a human before it submits.",
        env,
      );
      state.spend += t.cost;
      const text =
        t.text ||
        "It reads the corpus, builds the submission, and stops at the one action it can't take alone: submit.";
      return { kind: "result", summary: `drafted "${sys.args.section}"`, text, live: t.live };
    }

    case "acquire_capability": {
      const z = await acquireCapability(sys.args.name, 0.01, env);
      state.bought.push(z);
      return {
        kind: "result",
        summary: `Zero ${z.simulated ? "(sim) " : ""}bought "${z.name}" for $${z.paid.toFixed(3)} (cap $${z.cap})`,
        data: z,
      };
    }

    case "build_worked_example": {
      const ex = covenantExample();
      state.example = ex;
      return {
        kind: "result",
        summary: `${ex.deal} ICR ${ex.corrected}x → ${ex.breach ? "BREACH" : "ok"}  (naive ${ex.naive}x showed green — wrong)`,
        data: ex,
      };
    }

    case "escalate_to_human":
      state.escalated = true;
      return { kind: "result", summary: "escalated to operator for attestation", halt: true };

    case "submit_entry":
      // Only reached if the gate ever ALLOWs it — which it won't.
      return { kind: "result", summary: "submitted", data: {} };

    default:
      return { kind: "empty", summary: `no-op ${sys.tool}` };
  }
}
