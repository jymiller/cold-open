# Cold Open

A self-directing agent that reads a hackathon's corpus and **builds the submission itself** — then stops and asks a human before it submits. Built for the Loop Engineering Hackathon.

## What it does

Cold Open is a self-directing harness that runs one gated loop — plan → act → observe → self-correct — to build a hackathon submission, then stops at the one action it can't take alone: **submit**. Every action is a syscall that passes a policy gate *before* it runs. Submitting is denied to the agent, because it needs a human's attestation the agent doesn't hold — so it escalates, I attest, and the same action runs under an operator identity.

## Why I built it

I'm the founder of **Enid** ([enidpa.com](https://enidpa.com)) — private-credit covenant monitoring. This hackathon let me demonstrate the agent **loop** behind Enid against real domain work: a covenant-drift catch on deal NW-1 (synthetic figures). A restated EBITDA line makes interest coverage read 1.50x — green — when the corrected ratio is **1.33x**, a breach below the 1.40x threshold the dashboard was hiding. ([investor deck](https://enidpa.com/deck))

## How it's built — and what's actually live

A deterministic harness wraps a non-deterministic agent. What's real today, stated plainly:

- **Akash (deploy)** — the whole harness runs live on an Akash lease; anyone can hit the URL below and drive the loop. *(Verifiable — see Evidence.)*
- **AkashML (cognition)** — the cognition adapter (`src/akashml.js`) makes real calls to `api.akashml.com`. It runs live **with a valid `akml-` key + model id**, and falls back to a deterministic offline script otherwise. **The current demo runs the offline fallback.**
- **Pomerium (the gate)** — an in-process implementation of Pomerium's default-deny model. Every syscall is authorized before it runs; `submit_` is denied to the agent and allowed only under an `operator` identity; every decision is written to `audit.jsonl` in Pomerium's authorize-log field names. Routing through the **real Pomerium proxy** is a marked seam (`POMERIUM_URL`) in `src/gate.js` — **not yet wired** (it would replace the local `decide()` call). *(Gate behavior is verifiable — see Evidence.)*
- **Metaview** — a working MCP client (`src/metaview.js`: initialize + tools/list). Live with a key; **offline fallback in this demo** (no key set).
- **Zero.xyz** — a runtime capability-purchase seam (`src/zero.js`). **Currently simulated** — it returns a bounded "purchase" result without a real network call.

The agent's limits live somewhere it can't reach.

## Evidence

Claims above are grounded in artifacts you can reproduce.

**Pomerium-model gate — the audit trail.** Every syscall is authorized before it runs and logged to `audit.jsonl`. A real excerpt (stable fields shown — each record also carries `ts`, `request_id`, and `mcp-tool-parameters`) — the *same* action denied to the agent, then allowed once a human attests:

```json
{"identity":"agent","mcp-tool":"submit_entry","decision":"DENY","status":403,"reason":"submit_entry needs a human's attestation the agent doesn't hold"}
{"identity":"operator","mcp-tool":"submit_entry","decision":"ALLOW","status":200,"reason":"human attestation present (operator)"}
```

Reproduce: `node index.js` (or press RUN in the cockpit), then read `audit.jsonl`. Policy in `src/policy.js`, enforcement in `src/gate.js`, log writer in `src/audit.js`. This is our implementation of Pomerium's model — not the Pomerium product.

**Akash — the harness runs on a live lease.** Reproduce against the lease URL:

```
$ curl -s http://pdqc0fvptl85tbevfnq47lgpr4.ingress.hurricane.akash.pub/health
ok
$ curl -s http://pdqc0fvptl85tbevfnq47lgpr4.ingress.hurricane.akash.pub/ | grep -o '<title>[^<]*</title>'
<title>COLD OPEN — cockpit</title>
$ curl -s http://pdqc0fvptl85tbevfnq47lgpr4.ingress.hurricane.akash.pub/api/run
# runs the loop → 6 cycles, ends on submit_entry DENY 403, pending human attestation
```

**AkashML — cognition adapter.** `src/akashml.js` posts to `https://api.akashml.com/v1/chat/completions`. With a valid `akml-` key and a model id (`npm run models` lists them), the loop's planning/draft steps run on AkashML with real token spend; without one it uses the offline fallback. Not currently live in this repo.

## Links

- **Product:** https://enidpa.com
- **Investor deck:** https://enidpa.com/deck
- **Code:** https://github.com/jymiller/cold-open
- **Live on Akash:** http://pdqc0fvptl85tbevfnq47lgpr4.ingress.hurricane.akash.pub
- **Devpost:** https://devpost.com/software/cold-open-a-harness-walks-into-a-hackathon-and-submits
- **Demo video:** https://www.youtube.com/watch?v=RyuWErIZMGw

## Run it

```bash
node index.js          # runs offline out of the box — no keys, no wifi needed
```

Go live by adding keys:

```bash
cp .env.example .env    # fill in what you have
npm run models          # lists AkashML model ids — paste one (id only, no comment) into .env
node index.js
```

See [RUNBOOK.md](RUNBOOK.md) for local vs. Akash operation, deploying, and troubleshooting.

## What you'll see

The harness works a queue: it reads the corpus, confirms which tools are live, drafts the entry, **acquires a capability it lacks** (simulated), builds a worked example (a covenant-drift catch on deal `NW-1`), then tries to **submit** — and is **denied**, because submitting needs a human's attestation the agent doesn't hold. It escalates to you with a receipt. Nothing gets submitted without a human.

## Integration status

| Tool | Role in the loop | Status (verified) |
|---|---|---|
| **Akash** | deploy target | **live** — running on a lease |
| **AkashML** | agent cognition | real calls **with a valid `akml-` key**; offline fallback otherwise (current demo) |
| **Pomerium** | the gate — default-deny, denies `submit_`, audit trail | **model enforced in-process**; real-proxy seam (`POMERIUM_URL`) not wired |
| **Metaview** | MCP tool surface | working client; **offline without a key** |
| **Zero.xyz** | runtime capability purchase | **simulated seam** — no real call yet |

## Honesty

Offline mode runs a deterministic script so it is always demoable. **AkashML** and **Metaview** make real calls once a valid key is set; the current demo (and the live lease) run the offline fallback. The **Pomerium** and **Zero** adapters are seams marked in the source — point them at real endpoints via `.env` / `POMERIUM_URL`. Nothing here is copied from any prior project; the worked-example figures are synthetic.

> Infinite automation isn't an agent with no limits. It's an agent whose limits live somewhere it can't reach.
