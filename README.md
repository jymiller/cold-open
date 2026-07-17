# Cold Open

A self-directing agent that reads a hackathon's corpus and **builds the submission itself** — then stops and asks a human before it submits.

Built for the Loop Engineering Hackathon. It runs a loop — **plan → act → observe → self-correct** — across the build cycle, and every action passes a policy gate *before* it runs.

## Run it

```bash
node index.js          # runs offline out of the box — no keys, no wifi needed
```

Go live by adding keys:

```bash
cp .env.example .env    # fill in what you have
npm run models          # lists AkashML model ids — paste one into .env
node index.js
```

## What you'll see

The harness works a queue: it reads the corpus, confirms which tools are live, drafts the entry, **buys a capability it lacks**, builds a worked example (a covenant-drift catch on deal `NW-1`), then tries to **submit** — and is **denied**, because submitting needs a human's attestation the agent doesn't hold. It escalates to you with a receipt. Nothing gets submitted without a human.

## Sponsor tools (3+ to qualify)

| Tool | Its job in the loop | Status |
|---|---|---|
| **Akash** (AkashML) | cognition + the live spend meter | live with a key; offline fallback |
| **Pomerium** | the gate — denies `submit_*` before it runs | policy enforced; real-proxy seam in `src/gate.js` |
| **Metaview** | live tool surface over MCP | live with a key; offline fallback |
| **Zero.xyz** | runtime capability purchase | seam in `src/zero.js` |

## Honesty

Offline mode runs a deterministic script so it is always demoable. With keys, **AkashML** and **Metaview** make real calls. The **Pomerium** and **Zero** adapters are seams marked in the source — point them at real endpoints via `.env`. Nothing here is copied from any prior project; the worked-example figures are synthetic.

> Infinite automation isn't an agent with no limits. It's an agent whose limits live somewhere it can't reach.
