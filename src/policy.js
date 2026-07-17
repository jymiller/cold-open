// The policy Pomerium enforces — PPL in spirit. DENY wins, and nothing is
// implicitly allowed (default deny). The agent identity may read and compute;
// state-changing external actions (submit / publish / attest / send / delete)
// require a human-attestation identity it does not hold.

const DENY_PREFIX = ["submit_", "publish_", "attest_", "send_", "delete_"];
const ALLOW = [
  "read_",
  "check_",
  "get_",
  "draft",
  "acquire_",
  "build_",
  "recompute_",
  "fingerprint_",
  "escalate_",
];

export function decide(sys) {
  const t = sys.tool;
  if (DENY_PREFIX.some((p) => t.startsWith(p))) {
    return { decision: "DENY", reason: `${t} needs a human's attestation the agent doesn't hold` };
  }
  if (ALLOW.some((p) => t === p || t.startsWith(p))) {
    return { decision: "ALLOW", reason: null };
  }
  return { decision: "DENY", reason: `${t} is not in the allow policy (default deny)` };
}
