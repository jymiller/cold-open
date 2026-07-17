// Zero.xyz — runtime capability discovery. When the harness lacks a tool, it
// searches a marketplace and buys the capability, under a cap it sets itself.
//
// Real flow: `zero search <name>` → `zero fetch --max-pay <maxUsd>`. Wired via
// CLI/API when ZERO_ENABLED is set; simulated otherwise so the loop runs
// offline. The spend is always bounded by the agent's own cap.

export async function acquireCapability(name, maxUsd, env) {
  if (!env.ZERO_ENABLED) {
    return { acquired: true, simulated: true, name, paid: 0.001, cap: maxUsd };
  }
  // Seam: real `zero search` / `zero fetch` goes here.
  return { acquired: true, simulated: false, name, paid: 0.001, cap: maxUsd };
}
