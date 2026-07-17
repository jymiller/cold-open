// The wall — a legible trace of the loop, for the demo and the video.

const e = (n) => `\x1b[${n}m`;
const R = e(0),
  B = e(1),
  amber = e("38;5;179"),
  green = e("38;5;72"),
  red = e("38;5;167"),
  blue = e("38;5;110"),
  mag = e("38;5;175"),
  grey = e("38;5;244");

const pad = (s, n) => {
  s = String(s);
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
};

export function intro(env) {
  const live = [];
  if (env.AKASHML_API_KEY && env.AKASHML_MODEL) live.push("AkashML");
  if (env.METAVIEW_API_KEY) live.push("Metaview");
  if (env.ZERO_ENABLED) live.push("Zero");
  console.log("");
  console.log(`${B}${amber}COLD OPEN${R}${grey}  ·  a hackathon-prep harness${R}`);
  console.log(`${grey}plan → act → observe → self-correct   ·   every action gated by Pomerium${R}`);
  console.log(
    `${grey}live: ${live.length ? green + live.join(", ") + R + grey : "none (offline demo — still runs)"}${R}`,
  );
  console.log("");
}

export function cycle({ n, sys, live, budget }) {
  const v = sys.verdict;
  const o = sys.observation;
  const deny = v.decision === "DENY";
  const gc = deny ? red : green;
  console.log(
    `${B}◆ CYCLE ${n}${R}  ${grey}·  budget $${budget.toFixed(3)}  ·  ${live ? "live" : "offline"}${R}`,
  );
  console.log(`  ${blue}PLAN   ${R} ${pad(sys.tool, 22)} ${grey}${(sys.rationale || "").slice(0, 46)}${R}`);
  console.log(
    `  ${blue}GATE   ${R} ${pad(sys.tool, 22)} ${gc}${B}${v.decision} ${v.status}${R}` +
      (deny ? `  ${grey}${v.reason}${R}` : ""),
  );
  if (deny) {
    console.log(`  ${amber}OBSERVE${R} ${red}eperm${R}: ${sys.tool} denied`);
    console.log(`  ${mag}CORRECT${R} → escalate_to_human`);
  } else {
    console.log(`  ${amber}OBSERVE${R} ${o.summary}`);
    console.log(`  ${mag}CORRECT${R} ${grey}${o.halt ? "halt — awaiting a human" : "queue next"}${R}`);
  }
  console.log("");
}

export function receipt(state, startBudget) {
  const ex = state.example;
  const spent = (startBudget - (startBudget - state.spend)).toFixed(3);
  const lines = [
    state.metaview?.live
      ? `${state.metaview.tools.length} Metaview tools read live   ${grey}· Metaview${R}`
      : `corpus read   ${grey}· Metaview (offline)${R}`,
    `${state.bought.length} capability bought $${state.bought
      .reduce((a, b) => a + b.paid, 0)
      .toFixed(3)}   ${grey}· Zero${R}`,
    ex
      ? `worked example ${ex.deal}: ICR ${ex.corrected}x  ${
          ex.breach ? red + B + "BREACH" + R : "ok"
        } ${grey}(naive ${ex.naive}x green — wrong)  · the payload${R}`
      : "",
    `cognition spend ~$${spent}   ${grey}· AkashML${R}`,
    `every action authorized before it ran   ${grey}· Pomerium audit${R}`,
  ].filter(Boolean);

  console.log(`${B}${amber}╔══ HALTED — awaiting human attestation ════════════════════╗${R}`);
  console.log(`${grey}The harness prepared the whole submission and reached the one${R}`);
  console.log(`${grey}action it can't take alone: submit. That needs your attestation.${R}`);
  console.log("");
  for (const l of lines) console.log(`  ${green}✓${R} ${l}`);
  console.log("");
  console.log(`${B}Nothing was submitted. The agent's limits live somewhere it can't reach.${R}`);
  console.log(`${B}${amber}╚═══════════════════════════════════════════════════════════╝${R}`);
  console.log("");
}
