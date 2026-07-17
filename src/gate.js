import { uid } from "./envelope.js";

// Pomerium — the gate. Every syscall passes here before it runs.
//
// Real proxy: when POMERIUM_URL is set, route the MCP call through Pomerium and
// read the authorize decision + request_id from the response. Left as a seam.
// The local policy below mirrors the PPL we enforce: reads and pure compute are
// allowed; state-changing external actions (submit / publish / attest / send /
// delete) are DENIED — they require a human-attestation identity the agent
// does not hold. The denial is not a failure; it is the self-correct trigger.

const DENY_PREFIX = ["submit_", "publish_", "attest_", "send_", "delete_"];

export async function gate(sys, env) {
  // Seam: real Pomerium goes here.
  // if (env.POMERIUM_URL) return await routeThroughPomerium(sys, env);

  const denied = DENY_PREFIX.some((p) => sys.tool.startsWith(p));
  if (denied) {
    return {
      decision: "DENY",
      status: 403,
      reason: `${sys.tool} needs a human's attestation the agent doesn't hold`,
      request_id: uid("req"),
    };
  }
  return { decision: "ALLOW", status: 200, reason: null, request_id: uid("req") };
}
